import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'

type FocusShape = 'circle' | 'square' | 'triangle' | 'star'

@injectable()
export default class FocusRingPlugin implements GlobalPlugin {
    #storage: ChromeStorage
    #overlay: HTMLDivElement | null = null
    #hole: HTMLDivElement | null = null
    #path = window.location.pathname

    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
    ) {
        this.#storage = storage

        storage.createListener('focusRingEnabled', () => this.#render())
        storage.createListener('focusRingSize', () => this.#render())
        storage.createListener('focusRingShape', () => this.#render())
    }

    init(): void {
        this.#render()
    }

    onPathChange(path: string): void {
        this.#path = path
        this.#render()
    }

    #isGameplayPath(): boolean {
        return /^\/(game|challenge)\//.test(this.#path)
    }

    #ensureElements(): void {
        if (this.#overlay && this.#hole) {
            return
        }

        const overlay = document.createElement('div')
        overlay.setAttribute('data-qa', 'extenssr__focus-ring-overlay')
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '9998',
        })

        const hole = document.createElement('div')
        hole.setAttribute('data-qa', 'extenssr__focus-ring-hole')
        Object.assign(hole.style, {
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 0 0 200vmax rgba(8,8,10,0.82)',
        })

        overlay.append(hole)
        ;(document.body || document.documentElement).append(overlay)

        this.#overlay = overlay
        this.#hole = hole
    }

    #applyShape(shape: FocusShape): void {
        if (!this.#hole) {
            return
        }
        this.#hole.style.borderRadius = shape === 'circle' ? '50%' : '0'
        this.#hole.style.clipPath = 'none'

        if (shape === 'triangle') {
            this.#hole.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
        } else if (shape === 'star') {
            this.#hole.style.clipPath = 'polygon(50% 0%, 61% 36%, 98% 36%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 36%, 39% 36%)'
        }
    }

    #render(): void {
        const enabled = this.#storage.getCachedValue('focusRingEnabled')
        if (!enabled || !this.#isGameplayPath()) {
            if (this.#overlay) {
                this.#overlay.style.display = 'none'
            }
            return
        }

        this.#ensureElements()
        if (!this.#overlay || !this.#hole) {
            return
        }

        this.#overlay.style.display = 'block'

        const size = Math.max(10, Math.min(95, this.#storage.getCachedValue('focusRingSize')))
        const shape = this.#storage.getCachedValue('focusRingShape')

        this.#hole.style.width = `${size}vmin`
        this.#hole.style.height = `${size}vmin`
        this.#applyShape(shape)
    }
}
