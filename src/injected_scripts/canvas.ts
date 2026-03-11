import { aliasConfig } from './aliasing'
import CanvasManager, { ElementCreatorFactory } from '../postprocessing/backend/canvas_manager'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'

export default function canvasInject(broker: ChromeInjectedToContentBroker): void {
    /**
     * This script hijacks the canvas element and its getContext method. The goal is to intersect draw
     * calls made for displaying streetview panoramas, such that Extenssr can add post processing.
     */
    // Cache non-wrapped version of document.createElement.
    const elementCreator = document.createElement
    const elementFactory: ElementCreatorFactory =
        (elementName: string): HTMLElement => elementCreator.apply(document, [elementName])

    // Currently, we're only supporting webgl 1 backed post processing.
    const webGLStrings = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d']
    const detectWebGLSupport = (): boolean => {
        // This is a necessary, but not sufficient condition.
        if (!window.WebGLRenderingContext) {
            return false
        }
        const canvas = elementFactory('canvas') as HTMLCanvasElement
        for (const s of webGLStrings) {
            const ctx = canvas.getContext(s)
            if (ctx) {
                return true
            }
        }
        return false
    }

    const supportsWebGL = detectWebGLSupport()
    if (!supportsWebGL) {
        // TODO: Notify all settings code to grey out attempts at using post processing.
    } else {
        // Lessgoooooooooo
        const manager = new CanvasManager(elementFactory, broker)
        // Now wrap it up.
        aliasConfig(document, {
            createElement: (oldCreateElement) => (function(...args) {
                const hasUnityScript = document.querySelectorAll('mmap,kmap,sat-map,msmap,ymaps,lmap').length > 0
                if (args[0] && typeof args[0] === 'string' && args[0].toLowerCase() === 'canvas' && !hasUnityScript) {
                    return manager.createNewCanvas()
                }
                return oldCreateElement.apply(document, args)
            })
        })
    }
}

