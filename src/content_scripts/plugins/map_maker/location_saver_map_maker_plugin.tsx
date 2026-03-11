import { AbyssTag, ILogger } from 'logging/logging'
import { EndpointPlugin } from 'content/endpoints/content_script'
import { MapMakerMapIdProvider } from 'content/endpoints/map_maker_script'
import React from 'react'
import ReactDOM from 'react-dom/client'
import SavedLocationsList from './saved_locations_list'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

const CONTAINER_ID = 'saved-locations-list'
// Show saved locations.

@injectable()
export default class LocationSaverMapMakerPlugin extends EndpointPlugin {
    #selectShowSavedLocationsElement: HTMLElement | null = null
    #hideGutters: HTMLStyleElement = document.createElement('style')
    #root: ReactDOM.Root | null = null
    #rootDiv: HTMLElement | null = null

    #messageBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #mapMakerMapIdProvider: MapMakerMapIdProvider
    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.MapMakerMapIdProvider) mapMakerMapIdProvider: MapMakerMapIdProvider,
    ) {
        super(logger, AbyssTag.LOCATION_SAVER_MAP_MAKER_PLUGIN)
        this.#messageBroker = broker
        this.#innerBroker = innerBroker
        this.#hideGutters.textContent = '.map-maker-map ~ * { display: none; } #saved-locations-list {display:grid;}'
        this.#mapMakerMapIdProvider = mapMakerMapIdProvider
    }

    initImpl(): void {
        if (this.#mapMakerMapIdProvider.mapId !== undefined) {
            // We're modifying an existing map
            return
        }

        const adjacentMapOption = document.querySelector('main > .container > .container__content > .title + .container > .container__content > section > section:last-child')
        if (!this.#selectShowSavedLocationsElement) {
            this.#selectShowSavedLocationsElement = adjacentMapOption.cloneNode(true) as HTMLElement
            this.#selectShowSavedLocationsElement.querySelector('label.map-type').setAttribute('data-qa', 'map-type-saved')
            const img = this.#selectShowSavedLocationsElement.querySelector('.map-type__selector img')
            img.setAttribute('src', chrome.runtime.getURL('icons/extenssr_128.png'))
            img.setAttribute('alt', 'Saved locations')
            img.setAttribute('style', 'width:100%')
            this.#selectShowSavedLocationsElement.querySelector('.map-type__title').textContent = 'Saved locations'
            this.#selectShowSavedLocationsElement.querySelector('.map-type__description').textContent = 'View locations saved while playing. This option will not work well with a work in progress map! Save your progress before switching to this mode.'
            this.#selectShowSavedLocationsElement.onclick = () => this.#onShowSavedLocationsSelected()
            document.querySelectorAll('main > .container > .container__content > .title + .container > .container__content > section > section').forEach(element => {
                element.addEventListener('click', () => {
                    this.#onShowSavedLocationsDeselected()
                })
            })
        }
        setTimeout(() => {
            if(!this.#selectShowSavedLocationsElement.isConnected) {
                adjacentMapOption.insertAdjacentElement('afterend', this.#selectShowSavedLocationsElement)
            }
            if (this.#selectShowSavedLocationsElement.querySelector('input').checked) {
                this.#onShowSavedLocationsSelected()
            }
        }, 100)
        const parent = adjacentMapOption.parentElement
        parent.classList.remove('grid--num-columns-4')
        parent.classList.add('grid--num-columns-6')
    }
    #createContainer(): HTMLElement {
        const newDiv = document.createElement('section')
        newDiv.setAttribute('id', CONTAINER_ID)
        newDiv.classList.add('grid--gutter-size-medium')
        newDiv.classList.add('grid')
        newDiv.classList.add('grid--num-columns-2')
        newDiv.classList.add('margin--top')
        document.querySelector('.map-maker-map + *').insertAdjacentElement('afterend', newDiv)
        return newDiv
    }

    #recreateContainerIfNeeded(): void {
        if (document.body.contains(this.#rootDiv)) {
            this.#root.unmount()
            this.#rootDiv.remove()
            this.#root = null
        }
        if (!this.#root) {
            this.#rootDiv = this.#createContainer()
            this.#root = ReactDOM.createRoot(this.#rootDiv)
        }
    }

    #onShowSavedLocationsSelected(): void {
        const newParent = document.head || document.body || document.documentElement
        newParent.appendChild(this.#hideGutters)
        this.logger.log('Show saved locations selected')
        this.#recreateContainerIfNeeded()
        this.#root.render(<SavedLocationsList broker={this.#messageBroker} innerBroker={this.#innerBroker}/>)
       }

    #onShowSavedLocationsDeselected(): void {
        if (this.#hideGutters.isConnected) {
            this.#hideGutters.remove()
        }
        if (this.#root) {
            this.#rootDiv.remove()
            this.#rootDiv = null
            this.#root.unmount()
        }
        this.#root = null
        this.#innerBroker.sendExternalMessage('clearSavedLocations', null)
    }
    deinitImpl(): void {
        if (this.#mapMakerMapIdProvider.mapId !== undefined) {
            // We're modifying an existing map
            return
        }

        this.#onShowSavedLocationsDeselected()
        this.#selectShowSavedLocationsElement.remove()
    }
}
