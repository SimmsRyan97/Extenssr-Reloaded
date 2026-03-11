import React from 'react'
import FormGroup from '@mui/material/FormGroup'
import FormLabel from '@mui/material/FormLabel'
import ReactDOM from 'react-dom/client'
import { AbyssTag, ILogger } from 'logging/logging'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { MapStateProxiesProvider } from 'content/endpoints/map_script'
import CoopSetting from 'coop/coop_setting'
import makeCoopButtons from 'coop/make_coop_buttons'
import { MapFSM, MapState } from 'content/state_machines/map'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'

const replacedButtons = new WeakSet()

/**
 * Plugin for the /maps/<mapId>/play endpoint adding Coop features to the "Start a game" screen.
 */

@injectable()
export default class CoopMapPlugin extends EndpointPlugin implements StateChangeListener<MapState> {
    #messageBroker: ContentAndBackgroundMessageBroker
    #mapStateProxiesProvider: MapStateProxiesProvider
    #coopEnabled = false
    #timer = null
    constructor(
        @inject(MapFSM) fsm: MapFSM,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.MapStateProxiesProvider) mapStateProxiesProvider: MapStateProxiesProvider,
    ) {
        super(logger, AbyssTag.MAP_COOP_PLUGIN)
        fsm.addStateChangeListener(this)
        this.#messageBroker = broker
        this.#mapStateProxiesProvider = mapStateProxiesProvider
    }

    onStateChange(toState: MapState): void {
        if (toState === MapState.START_CHALLENGE) {
            this.#renderCoopSetting()
        }
    }

    #renderCoopSetting(): void {
        const button = this.#mapStateProxiesProvider.getStartChallengeButton()
        if (!button) {
            return
        }

        const wrapper = document.createElement('div')
        wrapper.classList.add('coop-wrapper')
        wrapper.style.textAlign = 'left'

        ReactDOM
            .createRoot(wrapper)
            .render((
                <FormGroup>
                    <FormLabel>Extenssr</FormLabel>
                    <CoopSetting defaultValue={false} onChange={(value) => this.#coopEnabled = value} />
                </FormGroup>
            ))

        button.parentElement.insertAdjacentElement('beforebegin', wrapper)
    }

    #getGameLink(): HTMLInputElement | null {
        return document.querySelector('input[name="copy-link"]')
    }

    #handleCoopMode(): void {
        const gameLinkInput = this.#getGameLink()
        try {
            const url = new URL(gameLinkInput.value)
            url.hash = this.#coopEnabled ? 'coop' : ''
            gameLinkInput.value = url.href
        } catch {
            // try/catch it just in case the URL was cut or modified
        }

        if (this.#coopEnabled) {
            this.#replaceButtons()
        } else {
            this.#restoreButton()
        }
    }

    #replaceButtons(): void {
        const startButton = this.#mapStateProxiesProvider.getStartChallengeButton()
        const linkInput = this.#getGameLink()
        const gameId = new URL(linkInput.value).pathname.split('/')[2]

        if (!startButton || replacedButtons.has(startButton)) {
            return
        }
        replacedButtons.add(startButton)

        const broker = this.#messageBroker
        makeCoopButtons(startButton, broker, gameId, {
            driving: 'Start driving! 🚗',
            mapping: 'Start mapping! 🗺️',
        })
    }

    initImpl(): void {
        this.#timer = setInterval(()=> {
            this.#handleCoopMode()
        }, 100)
    }

    deinitImpl(): void {
        if (this.#timer) {
            clearInterval(this.#timer)
            this.#timer = null
        }
    }

    #restoreButton(): void {
        const button = this.#mapStateProxiesProvider.getStartChallengeButton()
        if (replacedButtons.has(button)) {
            button.style.display = ''
            // Delete the two coop buttons
            button.nextElementSibling.remove()
            button.nextElementSibling.remove()
            replacedButtons.delete(button)
        }
    }
}
