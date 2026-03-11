import React from 'react'
import { ThemeProvider, StyledEngineProvider, createTheme, adaptV4Theme } from '@mui/material/styles'
import Container from '@mui/material/Container'
import ReactDOM from 'react-dom/client'
import { AbyssTag, ILogger } from 'logging/logging'
import type { ValueChangeListener } from 'storage/value_store'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { ChallengeScriptState } from 'content/endpoints/challenge_script'
import { CoopModesById, CoopMode } from 'coop/coop'
import CoopSetting from 'coop/coop_setting'
import makeCoopButtons, { CoopButtonLabels } from 'coop/make_coop_buttons'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'
import { GameFSM } from 'content/state_machines/game'
import { GameInfoProvider } from 'content/endpoints/game_script'

const JOIN_CHALLENGE_SELECTOR = '[data-qa="join-challenge-button"]'
const NEXT_ROUND_SELECTOR = '[data-qa="close-round-result"]'
const replacedButtons = new WeakSet()

/**
 * Plugin for the /challenge/<token> endpoint adding in-game Coop features.
 */

@injectable()
export default class CoopChallengePlugin extends EndpointPlugin implements StateChangeListener<ChallengeScriptState> {
    #coopModeListener: ValueChangeListener<CoopModesById> | null = null
    #coopStatusElement: HTMLElement | null = null
    #coopModeButton: HTMLButtonElement | null = null
    #preGameCoopSwitchWrapper: ReactDOM.Root | null = null
    #gameInfoProvider: GameInfoProvider

    #messageBroker: ContentAndBackgroundMessageBroker
    #storage: ChromeStorage

    constructor(
        @inject(config.GameInfoProvider) gameInfoProvider: GameInfoProvider,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(GameFSM) fsm: GameFSM,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeStorage) storage: ChromeStorage,
    ) {
        super(logger, AbyssTag.CHALLENGE_COOP_PLUGIN)
        this.#messageBroker = broker
        this.#storage = storage
        fsm.addStateChangeListener(this)
        this.#gameInfoProvider = gameInfoProvider
    }

    onStateChange(state: ChallengeScriptState): void {
        const { gameId } = this.#gameInfoProvider
        const roundId = this.#gameInfoProvider.getRoundNumber()
        const isCoopGame = this.#isCoopGame(gameId)

        if (state !== ChallengeScriptState.JOIN_CHALLENGE && this.#preGameCoopSwitchWrapper) {
            this.#preGameCoopSwitchWrapper.unmount()
            this.#preGameCoopSwitchWrapper = null
        }

        if (state === ChallengeScriptState.JOIN_CHALLENGE) {
            const initialIsCoopGame = location.hash === '#coop'
            this.#insertSwitch(initialIsCoopGame)
            this.#setCoopEnabled(initialIsCoopGame)
        }

        if (state === ChallengeScriptState.GUESS && isCoopGame) {
            this.#addSwitchModeButton()
            return
        } else {
            this.#removeSwitchModeButton()
        }

        // If there is no next round, we should not show the coop buttons
        if (isCoopGame && state === ChallengeScriptState.ROUND_RESULT && roundId < 4) {
            this.#replaceStartRoundButton(NEXT_ROUND_SELECTOR, {
                driving: 'Drive next round 🚗',
                mapping: 'Map next round 🗺️',
            })
        }
    }

    protected initImpl(): void {
        const { gameId } = this.#gameInfoProvider
        const storage = this.#storage

        this.#coopModeListener = storage.createListener('coopMode', (modes) => {
            this.#setMode(modes[gameId]?.mode ?? CoopMode.Driving)
        })
    }

    protected deinitImpl(): void {
        // Reset to the default mode
        this.#setMode(CoopMode.Driving)
        this.#restoreStartRoundButton()
        this.#removeSwitchModeButton()

        this.#coopModeListener?.deregister()
        this.#coopModeListener = null
    }

    #setCoopEnabled(value: boolean): void {
        if (value) {
            this.#replaceStartRoundButton(JOIN_CHALLENGE_SELECTOR, {
                driving: 'Start driving! 🚗',
                mapping: 'Start mapping! 🗺️',
            })
        } else {
            this.#restoreStartRoundButton()
        }
    }

    #insertSwitch(defaultValue: boolean): void {
        if (this.#preGameCoopSwitchWrapper) {
            return
        }

        const title = document.querySelector('h2')
        const div = document.createElement('div')

        const theme = createTheme(adaptV4Theme({
            palette: {
                mode: 'dark',
            },
        }))
        this.#preGameCoopSwitchWrapper = ReactDOM.createRoot(div)
        this.#preGameCoopSwitchWrapper.render((
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={theme}>
                    <Container maxWidth="md">
                        <h3>Extenssr</h3>
                        <CoopSetting defaultValue={defaultValue} onChange={(value) => this.#setCoopEnabled(value)} />
                    </Container>
                </ThemeProvider>
            </StyledEngineProvider>
        ))

        title.parentNode.append(div)
    }

    #getSwitchModeLabel(mode: CoopMode): string {
        return mode === CoopMode.Driving
            ? 'Switch to map 🗺️'
            : 'Switch to driving 🚗'
    }

    #isCoopGame(gameId: string): boolean {
        const storage = this.#storage

        return storage.getCachedValue('coopMode')[gameId]?.mode != null
    }

    #getCurrentStoredMode(gameId: string): CoopMode {
        const storage = this.#storage

        return storage.getCachedValue('coopMode')[gameId]?.mode ?? CoopMode.Driving
    }

    #addSwitchModeButton(): void {
        // Prevent double-adding the button, since we can get duplicate `GUESS` state notifications
        // on initial load.
        // TODO remove when the fsm is fixed to avoid that
        if (document.querySelector('[data-qa="extenssr__coop-switch"]')) {
            return
        }

        const broker = this.#messageBroker
        const { gameId } = this.#gameInfoProvider
        const referenceStatusNode = document.querySelector('[data-qa="round-number"]')
        const statusContainer = referenceStatusNode.parentNode

        const coopStatus = referenceStatusNode.cloneNode(true) as HTMLDivElement
        const [heading, body] = coopStatus.children

        coopStatus.setAttribute('data-qa', 'extenssr__coop-switch')
        // the status container is a flexbox in the new ui, yay!
        // now we can add elements consistently to the left side without getting reordered again by react rerenders.
        coopStatus.style.order = '-1'

        heading.textContent = 'Coop'

        const button = document.createElement('button')
        button.classList.add('button', 'button--small', 'button--primary')
        button.style.height = '22px' // make it the same size as other elements to prevent jumping
        button.textContent = this.#getSwitchModeLabel(this.#getCurrentStoredMode(gameId))
        button.onclick = () => {
            button.disabled = true
            const oldMode = this.#getCurrentStoredMode(gameId)
            broker.sendMessage('setCoopMode', {
                gameId,
                mode: oldMode === CoopMode.Driving ? CoopMode.Mapping : CoopMode.Driving,
            }).finally(() => {
                button.disabled = false
            })
        }

        body.replaceChildren(button)

        statusContainer.append(coopStatus)

        this.#coopModeButton = button
        this.#coopStatusElement = coopStatus
    }

    #removeSwitchModeButton(): void {
        this.#coopStatusElement?.remove()

        this.#coopModeButton = null
        this.#coopStatusElement = null
    }

    #setMode(mode: CoopMode): void {
        document.body.classList.toggle('extenssr__is-coop-mapping', mode === CoopMode.Mapping)
        if (this.#coopModeButton) {
            this.#coopModeButton.textContent = this.#getSwitchModeLabel(mode)
        }

        if (mode === CoopMode.Driving) {
            // The street view panorama was hidden before this, so it could not be measured
            // accurately by the google maps code. This can cause the image to be way too small
            // after reappearing. Triggering a resize after it is visible again will make the
            // maps SDK recalculate the size it should be.
            // Use the `Event` from the "main" realm and not the extension script sandbox so that
            // google maps can access properties on it.
            window.dispatchEvent(new window.Event('resize'))
        }
    }

    #replaceStartRoundButton(selector: string, labels: CoopButtonLabels): void {
        const startButton = document.querySelector(selector) as HTMLButtonElement

        if (replacedButtons.has(startButton)) {
            return
        }
        replacedButtons.add(startButton)

        const broker = this.#messageBroker
        const { gameId } = this.#gameInfoProvider

        makeCoopButtons(startButton, broker, gameId, labels)
    }

    #restoreStartRoundButton(): void {
        const button = document.querySelector(`${JOIN_CHALLENGE_SELECTOR}, ${NEXT_ROUND_SELECTOR}`) as HTMLButtonElement
        if (replacedButtons.has(button)) {
            button.style.display = ''
            // Delete the two coop buttons
            button.nextElementSibling.remove()
            button.nextElementSibling.remove()
            replacedButtons.delete(button)
        }
    }
}
