import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'

type FocusShape = 'circle' | 'square' | 'triangle' | 'star'

@injectable()
export default class FocusRingPlugin implements GlobalPlugin {
    #storage: ChromeStorage
    #overlay: HTMLDivElement | null = null
    #maskPath: SVGPathElement | null = null
    #outlinePath: SVGPathElement | null = null
    #path = window.location.pathname
    #onResize = () => this.#render()
    #mapHovered = false
    #hoveredMapElement: HTMLElement | null = null
    #escBypassUntil = 0
    #uiBypassActive = false
    #lastBypassState = false
    #statePollId: number | null = null
    #lastMapRectKey = ''
    #onPointerMove = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null
        const hoveredMap = target?.closest(this.#guessMapSelector())
        const hovered = !!hoveredMap
        this.#hoveredMapElement = hoveredMap instanceof HTMLElement ? hoveredMap : null
        if (hovered !== this.#mapHovered) {
            this.#mapHovered = hovered
            this.#render()
        }
    }
    #onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            this.#escBypassUntil = Date.now() + 50
            this.#render()
        }
    }

    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
    ) {
        this.#storage = storage

        storage.createListener('focusRingEnabled', () => this.#render())
        storage.createListener('focusRingSize', () => this.#render())
        storage.createListener('focusRingShape', () => this.#render())
        window.addEventListener('resize', this.#onResize)
        window.addEventListener('pointermove', this.#onPointerMove, { passive: true })
        window.addEventListener('keydown', this.#onKeyDown)
    }

    init(): void {
        this.#startStatePolling()
        this.#render()
    }

    onPathChange(path: string): void {
        this.#path = path
        this.#render()
    }

    #isGameplayPath(): boolean {
        return /^\/(game|challenge)\//.test(this.#path)
    }

    #guessMapSelector(): string {
        return [
            '.game-layout__guess-map',
            '[data-qa="guess-map"]',
            '[data-qa="guess-map__canvas"]',
        ].join(',')
    }

    #uiBypassSelector(): string {
        return [
            '[data-qa="close-round-result"]',
            '[data-qa="result-view-bottom"]',
            '[data-qa="result-layout"]',
            '.result-layout',
        ].join(',')
    }

    #settingsOverlaySelector(): string {
        return [
            '.game-settings',
            '[class*="game-settings"]',
            '[class*="in-game-settings"]',
            '[class*="pause-menu"]',
            '[data-qa="in-game-settings"]',
            '[data-qa="in-game-menu"]',
            '[data-qa="settings-modal"]',
            '[data-qa="settings-dialog"]',
            '[role="dialog"]',
            '[aria-modal="true"]',
        ].join(',')
    }

    #isVisibleElement(element: Element | null): boolean {
        if (!element || !(element instanceof HTMLElement)) {
            return false
        }
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
            return false
        }
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }

    #hasVisibleMatch(selector: string): boolean {
        return Array.from(document.querySelectorAll(selector)).some((node) => this.#isVisibleElement(node))
    }

    #hasVisibleSettingsOverlay(): boolean {
        const settingsNodes = Array.from(document.querySelectorAll(this.#settingsOverlaySelector()))
        const nodeMatch = settingsNodes.some((node) => {
            if (!this.#isVisibleElement(node)) {
                return false
            }
            const text = (node.textContent || '').toLowerCase()
            return text.includes('settings') || text.includes('resume game') || text.includes('leave game')
        })
        if (nodeMatch) {
            return true
        }

        const visibleButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
            .filter((node) => this.#isVisibleElement(node))
            .map((node) => (node.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim())

        const hasResume = visibleButtons.some((text) => text.includes('resume game'))
        const hasLeave = visibleButtons.some((text) => text.includes('leave game'))
        const hasSettingsHeader = Array.from(document.querySelectorAll('h1, h2, [role="heading"]'))
            .filter((node) => this.#isVisibleElement(node))
            .some((node) => (node.textContent || '').toLowerCase().includes('settings'))

        return (hasResume && hasLeave) || hasSettingsHeader
    }

    #rectKey(rect: DOMRect): string {
        return [
            Math.round(rect.left),
            Math.round(rect.top),
            Math.round(rect.right),
            Math.round(rect.bottom),
        ].join('|')
    }

    #buildWindowPath(width: number, height: number, left: number, top: number, right: number, bottom: number): string {
        const clampedLeft = Math.max(0, Math.min(width, left))
        const clampedTop = Math.max(0, Math.min(height, top))
        const clampedRight = Math.max(0, Math.min(width, right))
        const clampedBottom = Math.max(0, Math.min(height, bottom))
        if (clampedRight - clampedLeft <= 1 || clampedBottom - clampedTop <= 1) {
            return ''
        }
        return this.#buildRectPath(clampedLeft, clampedTop, clampedRight, clampedBottom)
    }

    #buildHudWindows(width: number, height: number): string {
        const windows: string[] = []

        const topMiddleWindow = this.#buildWindowPath(width, height, (width / 2) - 230, 8, (width / 2) + 230, 76)
        if (topMiddleWindow.length > 0) {
            windows.push(topMiddleWindow)
        }

        const topRightWindow = this.#buildWindowPath(width, height, width - 340, 8, width - 8, 128)
        if (topRightWindow.length > 0) {
            windows.push(topRightWindow)
        }

        const bottomLeftWindow = this.#buildWindowPath(width, height, 8, height - 300, 122, height - 8)
        if (bottomLeftWindow.length > 0) {
            windows.push(bottomLeftWindow)
        }

        return windows.join(' ')
    }

    #computeBypassState(): boolean {
        return this.#uiBypassActive || Date.now() < this.#escBypassUntil
    }

    #startStatePolling(): void {
        if (this.#statePollId !== null) {
            return
        }

        this.#statePollId = window.setInterval(() => {
            const uiBypassNow = this.#hasVisibleMatch(this.#uiBypassSelector()) || this.#hasVisibleSettingsOverlay()
            const bypassNow = uiBypassNow || Date.now() < this.#escBypassUntil
            let mapRectChanged = false
            if (this.#mapHovered) {
                const mapElement = this.#hoveredMapElement
                    ?? (document.querySelector(this.#guessMapSelector()) as HTMLElement | null)
                if (this.#isVisibleElement(mapElement)) {
                    const mapRectKey = this.#rectKey(mapElement.getBoundingClientRect())
                    mapRectChanged = mapRectKey !== this.#lastMapRectKey
                    this.#lastMapRectKey = mapRectKey
                }
            } else if (this.#lastMapRectKey.length > 0) {
                this.#lastMapRectKey = ''
            }

            if (uiBypassNow !== this.#uiBypassActive || bypassNow !== this.#lastBypassState || mapRectChanged) {
                this.#uiBypassActive = uiBypassNow
                this.#lastBypassState = bypassNow
                this.#render()
            }
        }, 50)
    }

    #buildRectPath(left: number, top: number, right: number, bottom: number): string {
        return this.#pointsToPath([
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom],
        ])
    }

    #ensureElements(): void {
        if (this.#overlay && this.#maskPath && this.#outlinePath) {
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

        const svgNs = 'http://www.w3.org/2000/svg'
        const svg = document.createElementNS(svgNs, 'svg')
        svg.setAttribute('data-qa', 'extenssr__focus-ring-svg')
        svg.setAttribute('width', '100%')
        svg.setAttribute('height', '100%')
        svg.setAttribute('preserveAspectRatio', 'none')
        Object.assign(svg.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
        })

        const maskPath = document.createElementNS(svgNs, 'path')
        maskPath.setAttribute('fill', 'rgba(0,0,0,0.99)')
        maskPath.setAttribute('fill-rule', 'evenodd')

        const outlinePath = document.createElementNS(svgNs, 'path')
        outlinePath.setAttribute('fill', 'none')
        outlinePath.setAttribute('stroke', 'rgba(255,255,255,0.35)')
        outlinePath.setAttribute('stroke-width', '1')

        svg.append(maskPath, outlinePath)
        overlay.append(svg)
        ;(document.body || document.documentElement).append(overlay)

        this.#overlay = overlay
        this.#maskPath = maskPath
        this.#outlinePath = outlinePath
    }

    #pointsToPath(points: Array<[number, number]>): string {
        const [first, ...rest] = points
        const segs = rest.map(([x, y]) => `L ${x} ${y}`).join(' ')
        return `M ${first[0]} ${first[1]} ${segs} Z`
    }

    #buildShapePath(shape: FocusShape, cx: number, cy: number, radius: number): string {
        if (shape === 'circle') {
            return [
                `M ${cx} ${cy - radius}`,
                `A ${radius} ${radius} 0 1 0 ${cx} ${cy + radius}`,
                `A ${radius} ${radius} 0 1 0 ${cx} ${cy - radius}`,
                'Z',
            ].join(' ')
        }

        if (shape === 'square') {
            const half = radius
            return this.#pointsToPath([
                [cx - half, cy - half],
                [cx + half, cy - half],
                [cx + half, cy + half],
                [cx - half, cy + half],
            ])
        }

        if (shape === 'triangle') {
            const half = radius
            return this.#pointsToPath([
                [cx, cy - half],
                [cx - half, cy + half],
                [cx + half, cy + half],
            ])
        }

        const outer = radius
        const inner = radius * 0.45
        const points: Array<[number, number]> = []
        for (let i = 0; i < 10; i++) {
            const angle = (-Math.PI / 2) + (i * Math.PI / 5)
            const r = i % 2 === 0 ? outer : inner
            points.push([cx + (Math.cos(angle) * r), cy + (Math.sin(angle) * r)])
        }
        return this.#pointsToPath(points)
    }

    #render(): void {
        const enabled = this.#storage.getCachedValue('focusRingEnabled')
        if (!enabled || !this.#isGameplayPath()) {
            if (this.#overlay) {
                this.#overlay.style.display = 'none'
            }
            return
        }

        this.#uiBypassActive = this.#hasVisibleMatch(this.#uiBypassSelector()) || this.#hasVisibleSettingsOverlay()
        const bypass = this.#computeBypassState()
        this.#lastBypassState = bypass
        if (bypass) {
            if (this.#overlay) {
                this.#overlay.style.display = 'none'
            }
            return
        }

        this.#ensureElements()
        if (!this.#overlay || !this.#maskPath || !this.#outlinePath) {
            return
        }

        this.#overlay.style.display = 'block'

        const size = Math.max(10, Math.min(100, this.#storage.getCachedValue('focusRingSize')))
        const shape = this.#storage.getCachedValue('focusRingShape')
        const width = Math.max(1, window.innerWidth)
        const height = Math.max(1, window.innerHeight)
        const radius = (Math.min(width, height) * size) / 200
        const cx = width / 2
        const cy = height / 2

        const outer = `M 0 0 H ${width} V ${height} H 0 Z`
        const innerShape = this.#buildShapePath(shape, cx, cy, radius)
        const hudHoles = this.#buildHudWindows(width, height)

        let mapHole = ''
        const mapElement = this.#hoveredMapElement
            ?? (document.querySelector(this.#guessMapSelector()) as HTMLElement | null)
        if (this.#mapHovered && this.#isVisibleElement(mapElement)) {
            const rect = mapElement.getBoundingClientRect()
            this.#lastMapRectKey = this.#rectKey(rect)
            const left = Math.max(0, Math.min(width, rect.left))
            const top = Math.max(0, Math.min(height, rect.top))
            const right = Math.max(0, Math.min(width, rect.right))
            const bottom = Math.max(0, Math.min(height, rect.bottom))
            if (right - left > 1 && bottom - top > 1) {
                mapHole = this.#buildRectPath(left, top, right, bottom)
            }
        }

        this.#maskPath.setAttribute('d', `${outer} ${innerShape} ${hudHoles} ${mapHole}`)
        this.#outlinePath.setAttribute('d', innerShape)
    }
}
