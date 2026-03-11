import { aliasConfig } from 'injected_scripts/aliasing'
import { ContextCreator } from './canvas_manager'
import { PostprocessHandler } from './postprocess_handler'
import noCarVertexShader from './shaders/vertex.glsl'
import noCarFragmentShader from './shaders/fragment.glsl'

import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
export interface ContextObserver {
    onRelease(): void
}
export interface Dirtifier {
    dirtify(): void
}

// TODO: Remove this once there's a proper solution
export type OffscreenContext = WebGLRenderingContext & { hideCar: boolean, isMainProgram: boolean, noCarLocation: WebGLUniformLocation }
export default class WebGLContextWrapper {
    // (Potentially) on-screen canvas
    canvas: HTMLCanvasElement
    // Delay creating a proper context until first draw call.
    contextCreator: ContextCreator

    offscreenCanvas: HTMLCanvasElement
    offscreenContext: OffscreenContext

    oldDrawElements = null
    oldDrawArrays = null

    observer: ContextObserver = null
    dirty = false
    dirtifier: Dirtifier
    broker: ChromeInjectedToContentBroker

    constructor(canvas: HTMLCanvasElement, contextCreator: ContextCreator, offscreenCanvas: HTMLCanvasElement, offscreenContext: WebGLRenderingContext, broker: ChromeInjectedToContentBroker) {
        this.canvas = canvas
        this.offscreenCanvas = offscreenCanvas
        this.offscreenContext = Object.assign(offscreenContext, { hideCar: false, isMainProgram: false, noCarLocation: null })
        this.contextCreator = contextCreator

        this.oldDrawArrays = this.offscreenContext.drawArrays
        this.oldDrawElements = this.offscreenContext.drawElements

        this.dirtifier = {
            dirtify: () => { this.dirty = true}
        }

        this.broker = broker

        const thees = this
        aliasConfig(this.offscreenContext, {
            drawElements: (oldDrawElements) => (function(...args) {
                thees.#preDraw()
                oldDrawElements.apply(offscreenContext, args)
                thees.onFirstDraw()
            }),
            drawArrays: (oldDrawArrays) => (function(...args) {
                thees.#preDraw()
                oldDrawArrays.apply(offscreenContext, args)
                thees.onFirstDraw()
            }),
            // TODO: this is a hack for the no car script; make this a proper postprocess step.
            shaderSource: (oldShaderSource) => (function(...args) {
                // Do not rewrite shaders unless the hide-car effect is enabled.
                if (!thees.offscreenContext.hideCar) {
                    return oldShaderSource.apply(thees.offscreenContext, args)
                }
                const shader = args[0]
                const source = args[1] as string
                const isLikelyStreetViewShader = source.includes('eyeDirection') || source.includes('ENABLE_TEXTURE') || source.includes('gl_Position')
                if (!isLikelyStreetViewShader) {
                    return oldShaderSource.apply(thees.offscreenContext, args)
                }
                if (source.includes('ENABLE_TEXTURE')) {
                    return oldShaderSource.apply(thees.offscreenContext, args)
                }
                if (source.includes('gl_Position')) {
                    return oldShaderSource.apply(thees.offscreenContext, [shader, noCarVertexShader])
                }
                return oldShaderSource.apply(thees.offscreenContext, [shader, noCarFragmentShader])
            }),
            linkProgram: (oldLinkProgram) => (function(...args) {
                oldLinkProgram.apply(thees.offscreenContext, args)
                const program = args[0] as WebGLProgram
                const linked = thees.offscreenContext.getProgramParameter(program, thees.offscreenContext.LINK_STATUS)
                if (!linked) {
                    return
                }
                const location = thees.offscreenContext.getUniformLocation(program, 'hideCar')
                if (location == null) {
                    return
                }
                thees.offscreenContext.noCarLocation = location
                const oldUseProgram = thees.offscreenContext.useProgram
                thees.offscreenContext.useProgram = function (...args2) {
                    oldUseProgram.apply(thees.offscreenContext, args2)
                    thees.offscreenContext.isMainProgram = args2[0] === program
                }
            })
        })
    }
    // Check if this should 
    onFirstDraw(): void {
        // First, revert alises.
        this.offscreenContext.drawArrays = this.oldDrawArrays
        this.offscreenContext.drawElements = this.oldDrawElements
        const dirtifier = this.dirtifier
        // OK, this is actually an on-screen canvas AND is related to streetview.
        if (this.canvas.parentElement && this.canvas.classList.contains('widget-scene-canvas')) {
            const thees = this
            const webglContext = this.contextCreator('webgl') as WebGLRenderingContext
            const postProcessHandler = new PostprocessHandler(this.canvas, webglContext, this.offscreenCanvas, this.offscreenContext, dirtifier, this.broker)
            this.broker.createListener('takeScreenshot', '', async () => {
                const data = new Uint8Array(await (await new Promise<Blob>((resolve) => this.offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.8))).arrayBuffer())
                return data
            })
            const cb = () => requestAnimationFrame(() => {
                if (this.dirty || postProcessHandler.hasAnimations) {
                    postProcessHandler.onOfscreenCanvasDrawn()
                    this.dirty = false
                }
                cb()
            })
            cb()
            aliasConfig(this.offscreenContext, {
                drawElements: (oldDrawElements) => (function(...args) {
                    thees.#preDraw()
                    if (thees.offscreenContext.isMainProgram && thees.offscreenContext.noCarLocation) {
                        thees.offscreenContext.uniform1fv(thees.offscreenContext.noCarLocation, [thees.offscreenContext.hideCar ? 0.0 : 1.0])
                    }
                    oldDrawElements.apply(thees.offscreenContext, args)
                    dirtifier.dirtify()
                }),
                drawArrays: (oldDrawArrays) => (function(...args) {
                    thees.#preDraw()
                    oldDrawArrays.apply(thees.offscreenContext, args)
                    dirtifier.dirtify()
                }),
            })
        } else { // We don't care about this canvas.
            this.#releaseContext()
            const thees = this
            // Treat this canvas as a 2D canvas, where everything from the offscreen one is just
            // copied verbatim.
            const canvas2DContext = this.contextCreator('2d') as CanvasRenderingContext2D
            const cb = () => requestAnimationFrame(() => {
                if (this.dirty) {
                    canvas2DContext.drawImage(thees.offscreenCanvas, 0, 0)
                }
                this.dirty = false
                cb()
            })
            cb()
            aliasConfig(this.offscreenContext, {
                drawElements: (oldDrawElements) => (function(...args) {
                    thees.#preDraw()
                    oldDrawElements.apply(thees.offscreenContext, args)
                    dirtifier.dirtify()
                }),
                drawArrays: (oldDrawArrays) => (function(...args) {
                    thees.#preDraw()
                    oldDrawArrays.apply(thees.offscreenContext, args)
                    dirtifier.dirtify()
                }),
            })
        }
    }
    #preDraw(): void {
        const { width, height } = this.canvas
        if (width != this.offscreenCanvas.width) {
            this.offscreenCanvas.width = width
        }
        if (height != this.offscreenCanvas.height) {
            this.offscreenCanvas.height = height
        }
    }
    // Release it from its mortal coil.
    #releaseContext(): void {
        if (this.observer) {
            this.observer.onRelease()
        }
        this.observer = null
    }
    setObserver(observer: ContextObserver): void {
        this.observer = observer
    }
}