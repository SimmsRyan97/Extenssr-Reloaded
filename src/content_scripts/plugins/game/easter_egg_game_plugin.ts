import { EndpointPlugin } from 'content/endpoints/content_script'
import { inject, injectable } from 'inversify'
import {AbyssTag, ILogger} from 'logging/logging'
import { ChromeStorage } from 'storage/chrome_storage'
import config from '../../../inversify.config'

// Maybe there'll be more easter eggs later?
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'A', 'Enter'].map(x=>x.toUpperCase())
const NO_COW_LEVEL = 'thereisnocowlevel'.toUpperCase().split('')
const maxSize = Math.max(KONAMI_CODE.length, NO_COW_LEVEL.length)

@injectable()
export default class EasterEggGamePlugin extends EndpointPlugin {
    keys: string[]
    #storage: ChromeStorage
    constructor(
        @inject(config.BaseLogger) baseLogger: ILogger,
        @inject(config.ChromeStorage) storage: ChromeStorage,
    ) {
        super(baseLogger, AbyssTag.EASTER_EGG_GAME_PLUGIN)
        this.keys = []
        this.#storage = storage
        document.addEventListener('keydown', (ev) => {
            this.keys.push(ev.key.toUpperCase())
            if (this.keys.length > maxSize) {
                this.keys = this.keys.slice(this.keys.length - maxSize)
            }
            const cmpStr = (otherStr) => {
                if (otherStr.length > this.keys.length) {
                    return false
                }
                for (let i1 = this.keys.length - 1, i2 = otherStr.length - 1; i2 >= 0; --i1, --i2) {
                    if (this.keys[i1] != otherStr[i2]) {
                        return false
                    }
                }
                return true
            }
            if (cmpStr(KONAMI_CODE)) {
                this.#storage.setValue('toon', true)
                this.#storage.setValue('toonScale', 17.0)
                this.#storage.setValue('pixelateMap', true)
                this.#storage.setValue('pixelateScale', 74.0)
                this.#storage.setValue('chromaticAberration', false)
                this.#storage.setValue('sobel', true)
            } else if(cmpStr(NO_COW_LEVEL)) {
                window.location.assign('https://www.youtube.com/watch?v=rRPQs_kM_nw')
            }
        })
    }
}