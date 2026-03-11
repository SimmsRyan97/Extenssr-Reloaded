import { aliasConfig } from 'injected_scripts/aliasing'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import WebGLContextWrapper, { ContextObserver } from './webgl_context_wrapper'

export type ElementCreatorFactory = (elementName: string) => HTMLElement
export type ContextCreator = (...args) => RenderingContext

export default class CanvasManager {
    factory: ElementCreatorFactory
    lastContextId = 0
    createdContexts: Map<number, WebGLContextWrapper> = new Map()
    broker: ChromeInjectedToContentBroker
    constructor(factory: ElementCreatorFactory, broker: ChromeInjectedToContentBroker) {
        this.factory = factory
        this.broker = broker
    }
    createNewCanvas(): HTMLCanvasElement {
        const canvas = this.factory('canvas') as HTMLCanvasElement
        const thees: CanvasManager = this
        aliasConfig(canvas, {
            getContext: (oldGetContext) => (function(...args) {
                if (canvas.getAttribute('data-engine') !== null) {
                    return oldGetContext.apply(canvas, args)
                }
                const creator: ContextCreator = function(...newArgs) {
                    return oldGetContext.apply(canvas, newArgs)
                }
                return thees.onContextRequested(canvas, creator, args)
            })
        })
        return canvas
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onContextRequested(canvas: HTMLCanvasElement, contextCreator: ContextCreator, args: any[]): RenderingContext {
        const contextType = args[0] as string
        // OK, this could be a canvas used to render Streetview
        if (contextType.includes('webgl')) {
            // Create a backing offscreen canvas.
            const backingCanvas = this.factory('canvas') as HTMLCanvasElement
            const options = args[1] || {}
            const backingContext = backingCanvas.getContext(contextType, options) as WebGLRenderingContext

            // Wrap up the context and 
            this.wrapContext(canvas, contextCreator, backingCanvas, backingContext)
            return backingContext
        }
        return contextCreator(...args)
    }

    wrapContext(canvas: HTMLCanvasElement, contextCreator: ContextCreator, offscreenCanvas: HTMLCanvasElement, offscreenContext: WebGLRenderingContext): void {
        const wrapper = new WebGLContextWrapper(canvas, contextCreator, offscreenCanvas, offscreenContext, this.broker)
        const id = this.lastContextId++
        const observer: ContextObserver = {
            onRelease: () => {
                this.createdContexts.delete(id)
            }
        }
        wrapper.setObserver(observer)
        this.createdContexts.set(id, wrapper)
    }
}
