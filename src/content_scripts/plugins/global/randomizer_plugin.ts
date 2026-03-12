import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'
import { ChromeMessageBroker } from 'messaging/content_to_background_broker'

@injectable()
export default class RandomizerPlugin implements GlobalPlugin {
  storage: ChromeStorage
  #broker: ChromeMessageBroker
  #inGameplayPath = false

    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ChromeMessageBroker
    ) {
        this.storage = storage
      this.#broker = broker

    storage.createListener('challengeSeedEnabled', (enabled) => {
      if (!enabled) {
        this.storage.setValue('challengeSeedStep', 0)
      }
    })

    storage.createListener('challengeSeed', (seed) => {
      if (!seed.trim()) {
        this.storage.setValue('challengeSeedStep', 0)
      }
    })

        broker.createListener('newRound', '', async () => {
      if (this.isSeedModeActive()) {
                broker.sendInternalMessage('randomize', null)
            }
        })
        broker.createListener('randomize', '', async () => await this.randomizer())
    }

    init(): void {
        //
    }
    onPathChange?(path: string): void {
      const wasGameplay = this.#inGameplayPath
      this.#inGameplayPath = this.isGameplayPath(path)

      if (!wasGameplay && this.#inGameplayPath && this.isSeedModeActive() && this.storage.getCachedValue('challengeSeedStep') === 0) {
        this.#broker.sendInternalMessage('randomize', null)
      }

      if (wasGameplay && !this.#inGameplayPath) {
        this.storage.setValue('challengeSeedStep', 0)
      }
    }

    async randomizer() {
      const rngInfo = this.getRngInfo()
      const rand = () => rngInfo?.random() ?? Math.random()
      const randomInt = (min, max) => Math.floor((rand() * (max - min + 1))) + min
      const randomFloat = (min, max) => rand() * (max - min) + min
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
          this.storage.setValue('min', false),
          this.storage.setValue('motionBlur', false),
          this.storage.setValue('hideCompass', false),
          this.storage.setValue('snowing', false),
          this.storage.setValue('aiOverlay', false),
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
          async () => {await this.storage.setValue('motionBlur', true)},
          async () => {await this.storage.setValue('hideCompass', true)},
        ]
        const specialEffects = [
          async () => {
            await this.storage.setValue('snowing', true)
          },
          async () => {
            await this.storage.setValue('aiOverlay', true)
          },
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

        const numSpecial = randomInt(0, specialEffects.length)
        const specialIndices = new Set<number>()
        for (let i = 0; i < numSpecial; ++i) {
          while (specialIndices.size === i)
            specialIndices.add(randomInt(0, specialEffects.length - 1))
        }
        specialIndices.forEach(index => effects.push(specialEffects[index]))

        await clearOptions()
        for (const effect of effects) {
          await effect()
        }

        if (rngInfo) {
          await this.storage.setValue('challengeSeedStep', rngInfo.step + 1)
        }
    }

    isSeedModeActive(): boolean {
      return this.storage.getCachedValue('challengeSeedEnabled') && this.storage.getCachedValue('challengeSeed').trim().length > 0
    }

    isGameplayPath(path: string): boolean {
      return /^\/(game|challenge|duels|battle-royale)\//.test(path)
    }

    getRngInfo(): { random: () => number, step: number } | null {
      const enabled = this.storage.getCachedValue('challengeSeedEnabled')
      const seed = this.storage.getCachedValue('challengeSeed').trim()
      if (!enabled || !seed) {
        return null
      }

      const step = this.storage.getCachedValue('challengeSeedStep')
      const hash = this.seedHash(`${seed}:${step}`)
      let state = hash >>> 0

      const random = () => {
        state = (state + 0x6D2B79F5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }

      return { random, step }
    }

    seedHash(str: string): number {
      let hash = 2166136261
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }
}
