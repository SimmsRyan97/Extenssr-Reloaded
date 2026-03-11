import { AbyssTag, ILogger } from 'logging/logging'
import { BattleRoyaleGameIdProvider } from 'content/endpoints/battle_royale_script'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { BattleRoyaleFSM, BattleRoyaleState } from 'content/state_machines/battle_royale'
import { injectLocations, removeLocationsDiv } from './battle_royale_locations'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'

@injectable()
export default class BattleRoyaleShowLocationsPlugin extends EndpointPlugin implements StateChangeListener<BattleRoyaleState> {
    #messageBroker: ContentAndBackgroundMessageBroker
    #gameIdProvider: BattleRoyaleGameIdProvider

    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(BattleRoyaleFSM) fsm: BattleRoyaleFSM,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.BattleRoyaleGameIdProvider) gameIdProvider: BattleRoyaleGameIdProvider,
    ) {
        super(logger, AbyssTag.BATTLE_ROYALE_SHOW_LOCATIONS_PLUGIN)
        fsm.addStateChangeListener(this)
        this.#messageBroker = broker
        this.#gameIdProvider = gameIdProvider
    }
    onStateChange(state: BattleRoyaleState): void {
        if (state !== BattleRoyaleState.IN_LOBBY) {
            injectLocations(this.#gameIdProvider.getGameId(), this.#messageBroker, this.logger)
        } else {
            removeLocationsDiv()
        }
    }
    protected deinitImpl(): void {
        removeLocationsDiv()
    }
}