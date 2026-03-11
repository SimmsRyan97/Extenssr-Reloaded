import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'
import { ChromeMessageBroker } from 'messaging/content_to_background_broker'

@injectable()
export default class RandomizerPlugin implements GlobalPlugin {
    enabled = false
    storage: ChromeStorage
    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ChromeMessageBroker
    ) {
        this.storage = storage
        storage.createListener('randomizer', (val) => {
            this.enabled = val
            if (this.enabled) {
              broker.sendInternalMessage('randomize', null)
            }
        })
        broker.createListener('newRound', '', async () => {
            if (this.enabled) {
                broker.sendInternalMessage('randomize', null)
            }
        })
        broker.createListener('randomize', '', async () => await this.randomizer())
    }

    init(): void {
        //
    }
    onPathChange?(_path: string): void {
        //
    }

    async randomizer() {
        const randomInt = (min, max) => Math.floor((Math.random() * (max - min + 1))) + min
        const randomFloat = (min, max) => Math.random() * (max - min) + min
        const clearOptions = async () => {
          await Promise.allSettled([
            this.storage.setValue('pixelateMap', false),
            this.storage.setValue('drunk', false),
            this.storage.setValue('fisheye', false),
            this.storage.setValue('chromaticAberration', false),
            this.storage.setValue('water', false),
            this.storage.setValue('scramble', false),

            this.storage.setValue('toon', false),
            this.storage.setValue('grayscale', false),
            this.storage.setValue('invert', false),
            this.storage.setValue('sepia', false),
            this.storage.setValue('mirror', false),
            this.storage.setValue('sobel', false),
            this.storage.setValue('vignette', false),
            this.storage.setValue('bloom', false),
            this.storage.setValue('min', false)
          ])
        }
        const nonMixableEffects = [
          async () => {await Promise.allSettled([this.storage.setValue('pixelateMap', true), this.storage.setValue('pixelateScale', randomFloat(4.0, 300))])},
          async () => {await this.storage.setValue('drunk', true)},
          async () => {await this.storage.setValue('fisheye', true)},
          async () => {await this.storage.setValue('chromaticAberration', true)},
          async () => {await this.storage.setValue('water', true)},
          async () => {await this.storage.setValue('scramble', true)},
          async () => {await this.storage.setValue('sobel', true)},
        ]
        const mixableEffects = [
          async () => {await Promise.allSettled([this.storage.setValue('toon', true), this.storage.setValue('toonScale', randomFloat(2.0, 20.0))])},
          async () => {await this.storage.setValue('grayscale', true)},
          async () => {await this.storage.setValue('invert', true)},
          async () => {await this.storage.setValue('sepia', true)},
          async () => {await this.storage.setValue('mirror', true)},
          async () => {await this.storage.setValue('vignette', true)},
          async () => {await this.storage.setValue('bloom', true)},
          async () => {await this.storage.setValue('min', true)},
        ]

        const chooseNonMixable = randomInt(1, 10) % 2 == 0
        const numMixable = randomInt(chooseNonMixable ? 0 : 1, mixableEffects.length / 2)
        const effects = []
        if (chooseNonMixable) {
          effects.push(nonMixableEffects[randomInt(0, nonMixableEffects.length - 1)])
        }
        const mixableIndices = new Set<number>()
        for (let i = 0; i < numMixable; ++i) {
          while (mixableIndices.size == i)
            mixableIndices.add(randomInt(0, mixableEffects.length - 1))
        }
        mixableIndices.forEach(index => effects.push(mixableEffects[index]))
        await clearOptions()
        for (const effect of effects) {
          await effect()
        }
    }
}
