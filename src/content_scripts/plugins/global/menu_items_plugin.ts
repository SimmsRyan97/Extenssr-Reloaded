import MapsApi, { Map } from 'api/maps'
import { GlobalPlugin } from '../../endpoint_transition_handler'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'

const DESELECTED_MENU_ITEM_SELECTOR = 'header nav li:not([class*="selected"])'

type SubMenuItem = {
    href: string,
    textContent: string,
}
@injectable()
export default class MenuItemsPlugin implements GlobalPlugin {
    #api: MapsApi | undefined
    #myMaps: Map[] | undefined
    #likedMaps: Map[] | undefined
    #observer: MutationObserver | undefined
    #initialLoad = true

    constructor(
        @inject(config.MapsApi) api: MapsApi
    ) {
        this.#api = api
    }

    onPathChange(path: string): void {
        // In-game screens have no `<header>` element
        const header = document.querySelector('header')
        if (document.querySelector('[data-qa="extenssr__nav-item"]') || !header) {
            return
        }

        // We might inject before the React tree hydrates, in that case React will remove our
        // injected elements again, so we need to add them back.
        if (this.#initialLoad) {
            this.#initialLoad = false
            this.#observer = new MutationObserver(() => {
                queueMicrotask(() => this.onPathChange(path))
            })
            this.#observer.observe(header, { childList: true, subtree: true })
            return
        } else if (this.#observer) {
            this.#observer.disconnect()
            this.#observer = null
        }

                const navList = header.querySelector('nav ol') as HTMLOListElement | null
                const referenceElement = (navList?.querySelector(DESELECTED_MENU_ITEM_SELECTOR)
                        ?? navList?.querySelector('li')) as HTMLLIElement | null
                if (!navList || !referenceElement) {
                        return
                }
                const container = referenceElement.closest('ol') as HTMLOListElement

        const createMenuItem = (props: { href: string, textContent: string, subMenu?: () => Promise<SubMenuItem[]> }) => {
            const li = referenceElement.cloneNode(true) as HTMLLIElement
            li.setAttribute('data-qa', 'extenssr__nav-item')

            const { href, textContent } = props
            Object.assign(li.querySelector('a'), { href, textContent })

            if (props.subMenu) {
                const overflows = [container.parentNode, container.parentNode.parentNode] as HTMLDivElement[]

                let controller: AbortController
                li.addEventListener('mouseenter', () => {
                    controller = new AbortController()
                    this.#showMenu(li, props.subMenu, controller.signal)
                    for (const el of overflows) {
                        el.style.overflow = 'visible'
                    }
                })
                li.addEventListener('mouseleave', () => {
                    controller?.abort()
                    controller = null
                    li.querySelector('[data-qa="extenssr__nav-submenu"]')?.remove()
                    for (const el of overflows) {
                        el.style.overflow = ''
                    }
                })
            }

            return li
        }

        const mapMaker = createMenuItem({
            href: '/map-maker',
            textContent: 'Map Maker',
            subMenu: async () => {
                this.#myMaps ??= await this.#api.getMyMaps(0, 10)
                const maps = this.#myMaps.map((map: Map) => ({
                    href: map.url,
                    textContent: map.name,
                }))
                if (maps.length >= 10) {
                    maps.push({ href: '/me/maps', textContent: 'All maps...' })
                }
                return maps
            }
        })

        const likedMaps = createMenuItem({
            href: '/me/likes',
            textContent: 'Liked Maps',
            subMenu: async () => {
                this.#likedMaps ??= await this.#api.getLikedMaps(0, 10)
                return this.#likedMaps.map((map: Map) => ({
                    href: map.url,
                    textContent: map.name,
                }))
            }
        })

        container.append(mapMaker, likedMaps)
    }

    #showMenu(reference: HTMLElement, items: () => Promise<SubMenuItem[]>, signal: AbortSignal): void {
        const subMenu = document.createElement('ol')
        subMenu.classList.add('extenssr__nav-submenu')
        subMenu.setAttribute('data-qa', 'extenssr__nav-submenu')

        items().then((list) => {
            subMenu.replaceChildren()
            subMenu.append(...list.map((item) => {
                const li = document.createElement('li')
                const a = document.createElement('a')
                Object.assign(a, item)
                li.append(a)
                return li
            }))

            if (!signal.aborted) {
                reference.append(subMenu)
            }
        })
    }
}
