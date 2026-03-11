import { EndpointPlugin } from 'content/endpoints/content_script'
import { AbyssTag, ILogger } from 'logging/logging'
import Mousetrap from 'mousetrap'
import { SourceType } from 'location_saving/location'
import { BattleRoyaleGameIdProvider } from 'content/endpoints/battle_royale_script'
import { BattleRoyaleFSM, BattleRoyaleState } from 'content/state_machines/battle_royale'
import {triggerSaveLocation} from 'location_saving/save_location'
import config from '../../../inversify.config'
import { inject, injectable } from 'inversify'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { IBattleRoyaleApi } from 'api/battle_royale'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

@injectable()
export default class BattleRoyaleLocationSaverPlugin extends EndpointPlugin {
    #gameIdProvider: BattleRoyaleGameIdProvider
    #fsm: BattleRoyaleFSM
    #broker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #api: IBattleRoyaleApi
    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(BattleRoyaleFSM) fsm: BattleRoyaleFSM,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.BattleRoyaleApi) api: IBattleRoyaleApi,
        @inject(config.BattleRoyaleGameIdProvider) gameIdProvider: BattleRoyaleGameIdProvider,
    ) {
        super(logger, AbyssTag.LOCATION_SAVER_BATTLE_ROYALE_PLUGIN)
        this.#fsm = fsm
        this.#broker = broker
        this.#innerBroker = innerBroker
        this.#api = api
        this.#gameIdProvider = gameIdProvider
    }
    initImpl(): void {
        Mousetrap.bind('mod+s', (e) => {
            e.preventDefault()
            const state = this.#fsm.getState()
            if (state !== BattleRoyaleState.IN_LOBBY && state !== BattleRoyaleState.LOADING) {
                this.#api.getBattleRoyaleGameState(this.#gameIdProvider.getGameId()).then(data => {
                    const roundId = data.rounds.length - 1
                    this.logger.log(`Battle royale ${this.#gameIdProvider.getGameId()} round ${roundId}`)
                    triggerSaveLocation({gameId: this.#gameIdProvider.getGameId(), mapName: 'Battle Royale', roundId: roundId + 1, type: SourceType.BR}, this.#broker, this.#innerBroker)
                })
            }
        })
    }
    deinitImpl(): void {
        Mousetrap.unbind('mod+s')
    }
}