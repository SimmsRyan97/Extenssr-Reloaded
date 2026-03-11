import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { GameInfoProvider } from 'content/endpoints/game_script'
import { AbyssTag, ILogger } from 'logging/logging'
import Mousetrap from 'mousetrap'
import { SourceType } from 'location_saving/location'
import { GameFSM, GameScriptState } from 'content/state_machines/game'
import { triggerSaveLocation } from 'location_saving/save_location'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

@injectable()
export default class LocationSaverGamePlugin extends EndpointPlugin implements StateChangeListener<GameScriptState> {
    #fsm: GameFSM
    #messageBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #gameInfoProvider: GameInfoProvider
    constructor(
        @inject(config.GameInfoProvider) gameInfoProvider: GameInfoProvider,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(GameFSM) fsm: GameFSM,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
    ) {
        super(logger, AbyssTag.LOCATION_SAVER_GAME_PLUGIN)
        this.#fsm = fsm
        this.#fsm.addStateChangeListener(this)
        this.#messageBroker = broker
        this.#innerBroker = innerBroker
        this.#gameInfoProvider = gameInfoProvider
    }
    initImpl(): void {
        Mousetrap.bind('mod+s', (e) => {
            e.preventDefault()
            const state = this.#fsm.getState()
            this.logger.log('Triggering save location from state ' + state)
            if (state === GameScriptState.GUESS) {
                this.logger.log('Saving location')
                triggerSaveLocation(
                    {
                        type: SourceType.GAME,
                        mapName: this.#gameInfoProvider.getMapName(),
                        gameId: this.#gameInfoProvider.gameId,
                        roundId: this.#gameInfoProvider.getRoundNumber() + 1
                    },
                    this.#messageBroker,
                    this.#innerBroker
                )
            }
        })
    }
    onStateChange(state: GameScriptState): void {
        if (state === GameScriptState.FINAL_RESULT || state === GameScriptState.ROUND_RESULT) {
            this.logger.log('Unlocked location')
            this.#messageBroker.sendMessage('unlockLocation', {
                type: SourceType.GAME,
                gameId: this.#gameInfoProvider.gameId,
                roundId: this.#gameInfoProvider.getRoundNumber() + 1,
                mapName: ''
            })
        }
    }
    deinitImpl(): void {
        Mousetrap.unbind('mod+s')
    }
}