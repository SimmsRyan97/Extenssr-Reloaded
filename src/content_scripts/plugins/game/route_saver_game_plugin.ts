import { LatLong } from 'api/game'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { GameInfoProvider } from 'content/endpoints/game_script'
import { AbyssTag, ILogger } from 'logging/logging'

import { GameFSM, GameScriptState } from 'content/state_machines/game'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
import { IMessageListener, Message } from 'messaging/broker'

@injectable()
export default class RouteSaverGamePlugin extends EndpointPlugin implements StateChangeListener<GameScriptState> {
    #moveListener: IMessageListener<Message<LatLong, void>> = null
    #goHomeListener: IMessageListener<Message<void>> = null
    #messageBroker: ContentAndBackgroundMessageBroker
    #gameInfoProvider: GameInfoProvider
    #innerBroker: ChromeContentToInjectedBroker
    constructor(
        @inject(config.GameInfoProvider) gameInfoProvider: GameInfoProvider,
        @inject(GameFSM) fsm: GameFSM,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker
    ) {
        super(logger, AbyssTag.EASTER_EGG_GAME_PLUGIN)
        this.#innerBroker = innerBroker
        fsm.addStateChangeListener(this)
        this.#messageBroker = broker
        this.#gameInfoProvider = gameInfoProvider
    }
    async onStateChange(state: GameScriptState): Promise<void> {
        if (state === GameScriptState.ROUND_RESULT) {
            const route = await this.#messageBroker.sendMessage('queryGameRoundRoute', {
                gameId: this.#gameInfoProvider.gameId,
                roundId: 'last',
            })
            if (!route) {
                return
            }
            this.#innerBroker.sendExternalMessage('showRoutes', route)
        } else if (state === GameScriptState.FINAL_RESULT) {
            const route = await this.#messageBroker.sendMessage('queryGameRoundRoute', {
                gameId: this.#gameInfoProvider.gameId,
                roundId: 'all',
            })
            if (!route) {
                return
            }
            this.#innerBroker.sendExternalMessage('showRoutes', route)
        } else {
            this.#innerBroker.sendExternalMessage('clearRoutes', null)
        }
        this.logger.log(`State ${state}`)
    }
    protected initImpl(): void {
        if (this.#moveListener) {
            return
        }
        this.#moveListener = this.#innerBroker.createListener('updatePosition', '', (pos: LatLong) => {
                this.#messageBroker.sendMessage('addPosToGameRoundRoute', {
                gameId: this.#gameInfoProvider.gameId,
                roundId: this.#gameInfoProvider.getRoundNumber().toString(),
                pos
            })
        })

        this.#goHomeListener = this.#innerBroker.createListener('goHome', '', () => {
            this.#messageBroker.sendMessage('goHomeInGameRoundRoute', {
                gameId: this.#gameInfoProvider.gameId,
                roundId: this.#gameInfoProvider.getRoundNumber().toString()
            })
        })
    }

    protected deinitImpl(): void {
        if (this.#moveListener) {
            this.#moveListener.deregister()
            this.#moveListener = null
        }
        if (this.#goHomeListener) {
            this.#goHomeListener.deregister()
            this.#goHomeListener = null
        }
        this.#innerBroker.sendExternalMessage('clearRoutes', null)
    }
}
