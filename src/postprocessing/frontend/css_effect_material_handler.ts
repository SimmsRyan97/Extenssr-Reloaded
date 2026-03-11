import { inject, injectable } from 'inversify'
import { AbyssTag, ILogger } from 'logging/logging'
import { ChromeStorage } from 'storage/chrome_storage'
import config from '../../inversify.config'
import { addCss } from './css_rules'

@injectable()
export default class CSSEffectMaterialHandler {
    grayscale = false
    invert = false
    sepia = false
    mirror = false
    logger: ILogger
    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.BaseLogger) logger: ILogger
    ) {
        this.logger = logger.withTag(AbyssTag.CSS_EFFECT_MATERIAL_HANDLER)
        storage.createListener('grayscale', (val) => {
            this.grayscale = val
            this.#updateMaterials()
        })
        storage.createListener('invert', (val) => {
            this.invert = val
            this.#updateMaterials()
        })
        storage.createListener('sepia', (val) => {
            this.sepia = val
            this.#updateMaterials()
        })
        storage.createListener('mirror', (val) => {
            this.mirror = val
            this.#updateMaterials()
        })
        this.#updateMaterials()
    }
    #updateMaterials() {
        const filters = []
        if (this.grayscale) {
            filters.push('grayscale()')
        }
        if (this.invert) {
            filters.push('invert(1)')
        }
        if (this.sepia) {
            filters.push('sepia(1)')
        }
        const rule = filters.length > 0 ? ('filter: ' + filters.join(' ') + ';') : ''
        const mirror = this.mirror ? 'transform: scaleX(-1);' : ''
        const effect = `
            canvas.widget-scene-canvas {
                ${rule}
                ${mirror}
            }
        `
        addCss('funnynumber', effect)
    }
}