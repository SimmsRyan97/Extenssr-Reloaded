import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'

type BlinkMode = 'fixed' | 'decrease' | 'random'

@injectable()
export default class BlinkModePlugin implements GlobalPlugin {
    #enabled = false
    #mode: BlinkMode = 'fixed'
    #timeSeconds = 1.5
    #decreaseStepSeconds = 0.5
    #minTimeSeconds = 1.0
    #randomMaxSeconds = 8.0
    #roundDelaySeconds = 0
    #roundIndex = 0
    #lastPath = ''
    #path = ''
    #wasBackdropOrLoading = false
    #showTimeoutId: ReturnType<typeof setTimeout> | null = null
    #hideTimeoutId: ReturnType<typeof setTimeout> | null = null
    #observer: MutationObserver | null = null

    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
    ) {
        storage.createListener('blinkEnabled', (val) => {
            this.#enabled = Boolean(val)
            if (!this.#enabled) {
                this.#resetBlinkState()
            }
        })

        storage.createListener('blinkMode', (val) => {
            if (val === 'fixed' || val === 'decrease' || val === 'random') {
                this.#mode = val
            }
        })

        storage.createListener('blinkTimeSeconds', (val) => {
            this.#timeSeconds = this.#sanitizeNumber(val, 1.5, 0.1, 30)
        })

        storage.createListener('blinkDecreaseStepSeconds', (val) => {
            this.#decreaseStepSeconds = this.#sanitizeNumber(val, 0.5, 0.1, 10)
        })

        storage.createListener('blinkMinTimeSeconds', (val) => {
            this.#minTimeSeconds = this.#sanitizeNumber(val, 1.0, 0.1, 30)
        })

        storage.createListener('blinkRandomMaxSeconds', (val) => {
            this.#randomMaxSeconds = this.#sanitizeNumber(val, 8.0, 0.1, 8.0)
        })

        storage.createListener('blinkRoundDelaySeconds', (val) => {
            this.#roundDelaySeconds = this.#sanitizeNumber(val, 0, 0, 15)
        })
    }

    init(): void {
        this.#ensureStyleNode()
        this.#ensureObserver()
    }

    onPathChange(path: string): void {
        if (path !== this.#lastPath) {
            this.#roundIndex = 0
            this.#lastPath = path
        }
        this.#path = path
        if (!this.#isSupportedPath()) {
            this.#resetBlinkState()
        }
    }

    #ensureObserver(): void {
        if (this.#observer) {
            return
        }
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => this.#ensureObserver(), { once: true })
            return
        }

        this.#observer = new MutationObserver(() => {
            if (!this.#enabled || !this.#isSupportedPath()) {
                return
            }
            if (this.#isBackdropThereOrLoading()) {
                this.#wasBackdropOrLoading = true
                if (!this.#isLoading()) {
                    this.#hidePanorama()
                }
                return
            }
            if (this.#wasBackdropOrLoading) {
                this.#wasBackdropOrLoading = false
                this.#triggerBlink()
            }
        })

        this.#observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: false,
        })
    }

    #triggerBlink(): void {
        const visibleSeconds = this.#getVisibleSecondsForRound()
        this.#hidePanorama()
        if (this.#showTimeoutId) {
            clearTimeout(this.#showTimeoutId)
        }
        this.#showTimeoutId = setTimeout(() => this.#showPanorama(), this.#roundDelaySeconds * 1000)

        if (this.#hideTimeoutId) {
            clearTimeout(this.#hideTimeoutId)
        }
        this.#hideTimeoutId = setTimeout(() => this.#hidePanorama(), (visibleSeconds + this.#roundDelaySeconds) * 1000)
        this.#roundIndex += 1
    }

    #resetBlinkState(): void {
        this.#wasBackdropOrLoading = false
        this.#roundIndex = 0
        if (this.#showTimeoutId) {
            clearTimeout(this.#showTimeoutId)
            this.#showTimeoutId = null
        }
        if (this.#hideTimeoutId) {
            clearTimeout(this.#hideTimeoutId)
            this.#hideTimeoutId = null
        }
        this.#showPanorama()
    }

    #getVisibleSecondsForRound(): number {
        if (this.#mode === 'random') {
            const max = Math.max(0.1, this.#randomMaxSeconds)
            return Number((Math.random() * max).toFixed(1))
        }
        if (this.#mode === 'decrease') {
            const raw = this.#timeSeconds - (this.#decreaseStepSeconds * this.#roundIndex)
            return Math.max(this.#minTimeSeconds, Number(raw.toFixed(1)))
        }
        return this.#timeSeconds
    }

    #getPanoramaRoot(): HTMLElement | null {
        const dataQaRoot = document.querySelector('[data-qa="panorama"]') as HTMLElement | null
        if (dataQaRoot) {
            return dataQaRoot
        }
        return document.querySelector('.game-layout__panorama') as HTMLElement | null
    }

    #hidePanorama(): void {
        const root = this.#getPanoramaRoot()
        if (root) {
            root.classList.add('extenssr-blink-hidden')
        }
    }

    #showPanorama(): void {
        document.querySelectorAll('.extenssr-blink-hidden').forEach((el) => {
            el.classList.remove('extenssr-blink-hidden')
        })
    }

    #isLoading(): boolean {
        return Boolean(
            document.querySelector('[class*=fullscreen-spinner_root__]')
            || document.querySelector('[class*=round-score-2_isMounted__]')
            || document.querySelector('[class*=new-game-2_isAnimated__]')
            || !document.querySelector('.widget-scene-canvas')
        )
    }

    #isBackdropThereOrLoading(): boolean {
        return Boolean(
            this.#isLoading()
            || document.querySelector('[class*=result-layout_root__]')
            || document.querySelector('[class*=overlay_backdrop__]')
            || document.querySelector('[class*=round-starting_wrapper__]')
            || document.querySelector('[class*=popup_backdrop__]')
            || document.querySelector('[class*=game-starting_container__]')
            || document.querySelector('[class*=round-score_container__]')
            || document.querySelector('[class*=overlay-modal_backlight__]')
        )
    }

    #isSupportedPath(): boolean {
        return this.#path.startsWith('/game/')
            || this.#path.startsWith('/challenge/')
            || this.#path.startsWith('/battle-royale/')
            || this.#path.includes('/duels')
            || this.#path.includes('/team-duels')
    }

    #ensureStyleNode(): void {
        const styleId = 'extenssr-blink-style'
        if (document.getElementById(styleId)) {
            return
        }
        const styleNode = document.createElement('style')
        styleNode.id = styleId
        styleNode.textContent = `
            .extenssr-blink-hidden {
                filter: brightness(0%) !important;
            }
        `
        const parent = document.head || document.body || document.documentElement
        parent.appendChild(styleNode)
    }

    #sanitizeNumber(value: unknown, fallback: number, min: number, max: number): number {
        const parsed = typeof value === 'number' ? value : Number(value)
        if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
            return fallback
        }
        if (parsed < min) {
            return min
        }
        if (parsed > max) {
            return max
        }
        return parsed
    }
}