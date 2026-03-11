import { AiWorkerMessage } from 'messaging/ai_worker_message'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { ContentToWebWorkerBroker } from 'messaging/content_to_web_worker_broker'

import Texture from './texture'
import { Dirtifier } from './webgl_context_wrapper'

/**
 * For now, use only SSD_MobileNetv1 as a model, with the possibility of using better models in the
 * future. This model is smøl, fast and accurate enough **for now**.
 */
export default class AiOverlay {
    // Canvas hijacked by Extenssr.
    inputCanvas: HTMLCanvasElement
    outputContext: WebGLRenderingContext

    // Canvas used to downscale the image to fit the model.
    // For models that accept arbitrary image sizes, it just scales down the image for perf.
    downscaleCanvas: HTMLCanvasElement
    downscaleContext: CanvasRenderingContext2D
    scale = 2.0 // image will be downscaled by this factor

    maskCanvas: HTMLCanvasElement
    maskContext: CanvasRenderingContext2D

    // Double buffer the mask texture.
    maskTexture: Texture
    backupTexture: Texture

    dirtifier: Dirtifier

    extBaseUrl = ''
    loaded = false
    loading = false
    enabled = false

    inferring = false
    worker: Worker = null
    workerBroker: ContentToWebWorkerBroker<AiWorkerMessage> = null
    broker: ChromeInjectedToContentBroker

    constructor(inputCanvas: HTMLCanvasElement, outputContext: WebGLRenderingContext, dirtifier: Dirtifier, broker: ChromeInjectedToContentBroker) {
        this.inputCanvas = inputCanvas
        this.outputContext = outputContext
        this.dirtifier = dirtifier
        this.broker = broker
        const gl = outputContext
        this.maskTexture = new Texture(gl)
        this.backupTexture = new Texture(gl)
        this.downscaleCanvas = document.createElement('canvas')
        this.downscaleContext = this.downscaleCanvas.getContext('2d')
        this.maskCanvas = document.createElement('canvas')
        this.maskContext = this.maskCanvas.getContext('2d')

        this.backupTexture.fromBuffer(1, 1, new Uint8Array([255, 255, 255, 255]))
    }

    async recomputeMask(): Promise<void> {
        if (this.inferring || !this.loaded || !this.enabled) {
            return
        }

        this.inferring = true

        await this.#addRectsToMask()

        this.inferring = false
        this.dirtifier.dirtify()
    }

    async #addRectsToMask(): Promise<void> {
        const rects = await this.workerBroker.sendExternalMessage('hideCars', this.#getImageData())

        const {width, height} = this.downscaleCanvas
        this.maskCanvas.width = width
        this.maskCanvas.height = height
        this.maskContext.clearRect(0, 0, width, height)
        this.maskContext.fillStyle = 'white'

        for (const rect of rects) {
            const {y_min, x_min, y_max, x_max} = rect
            this.maskContext.beginPath()
            const radius_x = (x_max - x_min) / 2
            const radius_y = (y_max - y_min) / 2
            const center_x = x_min + radius_x
            const center_y = y_min + radius_y
            this.maskContext.ellipse(center_x, center_y, radius_x * 2.5, radius_y * 2.5, 0, 0, 2.0 * Math.PI)
            this.maskContext.fill()
        }

        this.backupTexture.fromCanvas(this.maskCanvas)
        const x = this.maskTexture
        this.maskTexture = this.backupTexture
        this.backupTexture = x
    }

    #getImageData(): ImageData {
        const {width, height} = this.inputCanvas
        const scaled_width = width / this.scale
        const scaled_height = height / this.scale
        this.downscaleCanvas.width = scaled_width
        this.downscaleCanvas.height = scaled_height
        this.downscaleContext.drawImage(this.inputCanvas, 0, 0, width, height, 0, 0, scaled_width, scaled_height)
        return this.downscaleContext.getImageData(0, 0, scaled_width, scaled_height)
    }

    setupLoadingScreen() {
        this.loading = true
        const loadingSpinner = document.createElement('div')
        loadingSpinner.classList.add('ring')
        loadingSpinner.setAttribute('id', 'loading-model')
        loadingSpinner.textContent = 'Loading AI model'
        loadingSpinner.appendChild(document.createElement('span'))
        document.body.appendChild(loadingSpinner)
    }

    stopLoadingScreen() {
        document.getElementById('loading-model')?.remove()
        this.loading = false
        this.loaded = true
    }

    async initWorker(): Promise<void> {
        const urlInsideExt = `${this.extBaseUrl}ai_worker.bundle.js`
        const workerScript = await (await fetch(urlInsideExt)).blob()
        const url = URL.createObjectURL(workerScript)
        this.worker = new Worker(url)
        URL.revokeObjectURL(url)
        this.workerBroker = new ContentToWebWorkerBroker<AiWorkerMessage>(this.worker)      
        await this.workerBroker.sendExternalMessage('loadModel', this.extBaseUrl)
    }

    async initModel(): Promise<void> {
        if (this.loaded || this.loading || this.worker) {
            return
        }
        if (!this.extBaseUrl) {
            this.extBaseUrl = await this.broker.sendExternalMessage('requestExtBaseUrl', null)
        }
        this.setupLoadingScreen()
        await this.initWorker()
        this.stopLoadingScreen()
    }
}