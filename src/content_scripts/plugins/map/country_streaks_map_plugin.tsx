import { GameSettings, GameType, IGameApi } from 'api/game'
import { AbyssTag, ILogger } from 'logging/logging'
import { ChromeStorage } from 'storage/chrome_storage'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { MapInfoProvider, MapStateProxiesProvider } from 'content/endpoints/map_script'
import { MapFSM, MapState } from 'content/state_machines/map'
import React from 'react'
import { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { FormGroup, FormControlLabel, Switch } from '@mui/material'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'

const COUNTRY_STREAKS_TOGGLE_ID = 'country-streaks'

/**
 * Plugin for the /maps/<mapId>/play endpoint related to country streaks functionality
 */

@injectable()
export default class CountryStreaksMapPlugin extends EndpointPlugin implements StateChangeListener<MapState> {
    #countryStreaks = false
    #api: IGameApi
    #messageBroker: ContentAndBackgroundMessageBroker
    #storage: ChromeStorage
    #wrapperDiv: HTMLElement | null = null
    #wrapperRoot: ReactDOM.Root | null = null
    #mapStateProxiesProvider: MapStateProxiesProvider
    #mapInfoProvider: MapInfoProvider
    constructor(
        @inject(config.GameApi) api: IGameApi,
        @inject(MapFSM) fsm: MapFSM,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.MapStateProxiesProvider) mapStateProxiesProvider: MapStateProxiesProvider,
        @inject(config.MapInfoProvider) infoProvider: MapInfoProvider
    ) {
        super(logger, AbyssTag.COUNTRY_STREAKS_MAP_PLUGIN)
        fsm.addStateChangeListener(this)
        this.#api = api
        this.#messageBroker = broker
        this.#storage = storage
        this.#mapStateProxiesProvider = mapStateProxiesProvider
        this.#mapInfoProvider = infoProvider
    }

    recreateWrapperIfNeeded(): void {
        if (this.#wrapperDiv && document.body.contains(this.#wrapperDiv)) {
            return
        }
        if (this.#wrapperDiv) {
            this.#wrapperRoot.unmount()
            this.#wrapperDiv.remove()
        }
        const oldButton = this.#mapStateProxiesProvider.getStartGameButton()
        const newButton = this.#mapStateProxiesProvider.getStartGameButton().cloneNode(true) as HTMLElement
        oldButton.insertAdjacentElement('beforebegin', newButton)
        newButton.removeAttribute('data-qa')
        oldButton.setAttribute('style', 'display:none')
        const settings = document.querySelector('.container__content > div > div:last-child')
        this.#wrapperDiv = document.createElement('div')
        this.#wrapperDiv.id = COUNTRY_STREAKS_TOGGLE_ID
        settings.insertAdjacentElement('beforebegin', this.#wrapperDiv)
        newButton.onclick = () => {
            const settings: GameSettings = Object.assign(
                {
                    forbidMoving: false,
                    forbidRotating: false,
                    forbidZooming: false,
                    timeLimit: 0
                },
                JSON.parse(window.localStorage.getItem('game-settings')))
            settings.timeLimit = settings.timeLimit || 0
            if (this.#countryStreaks) {
                this.#api.createGame(this.#mapInfoProvider.mapId, GameType.STANDARD, settings).then(async (game) => {
                    await this.#messageBroker.sendMessage('startStreak', game)
                    const newUrl = `https://www.geoguessr.com/game/${game.token}`
                    window.location.assign(newUrl)
                }).catch(error => {
                    alert(`Failed to start streak: ${error}`)
                })
            } else {
                oldButton.click()
            }
        }
        this.#wrapperRoot = ReactDOM.createRoot(this.#wrapperDiv)
        this.#wrapperRoot.render(<CountryStreakToggle streaksEnabled={this.#countryStreaks} storage={this.#storage} onToggle={(val) => { this.#countryStreaks = val }} />)
    }

    onStateChange(toState: MapState): void {
        this.logger.log(toState)
        if (toState === MapState.START_GAME && this.#mapStateProxiesProvider.getStartGameButton()) {
            setTimeout(() => this.recreateWrapperIfNeeded(), 1000)
        } else {
            if (this.#wrapperDiv) {
                this.#wrapperRoot.unmount()
                this.#wrapperDiv.remove()
                this.#wrapperDiv = null
            }
        }
    }
}

function CountryStreakToggle(props: { streaksEnabled: boolean, onToggle: (val: boolean) => void, storage: ChromeStorage }) {
    const [useCountryStreaks, setUseCountryStreaks] = useState(props.streaksEnabled)
    return <FormGroup>
        <FormControlLabel
            label="Play as a country streak (Extenssr feature)"
            control={
                <Switch
                    color="primary"
                    checked={useCountryStreaks}
                    onChange={(evt) => {
                        setUseCountryStreaks(evt.target.checked)
                        props.onToggle(evt.target.checked)
                    }}
                />
            }
        />
    </FormGroup>
}