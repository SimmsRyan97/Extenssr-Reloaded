import { AbyssTag, ILogger } from 'logging/logging'
import EndpointScript from 'content/endpoints/content_script'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { BattleRoyaleCode, BattleRoyaleGameState, BattleRoyaleWebsocketMessage, IBattleRoyaleApi } from 'api/battle_royale'
import { BattleRoyaleEvent, BattleRoyaleFSM } from 'content/state_machines/battle_royale'
import { Container, inject, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'
import BattleRoyaleShowLocationsPlugin from 'content/plugins/battle_royale/battle_royale_show_locations_plugin'
import BattleRoyaleLocationSaverPlugin from 'content/plugins/battle_royale/battle_royale_location_saver_plugin'
import { IMessageListener, Message } from 'messaging/broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'


@injectable()
export class BattleRoyaleGameIdProvider {
    gameId = ''
    getGameId(): string { return this.gameId }
    setGameId(id: string): void { this.gameId = id }
}

@injectable()
export default class BattleRoyaleScript extends EndpointScript {
    #gameIdProvider: BattleRoyaleGameIdProvider = new BattleRoyaleGameIdProvider()
    #fsm: BattleRoyaleFSM
    #api: IBattleRoyaleApi
    #messageBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #listener: IMessageListener<Message<BattleRoyaleWebsocketMessage>>
    #lastBrGameState: BattleRoyaleGameState = null

    #onWebsocketMessage = async (message: BattleRoyaleWebsocketMessage): Promise<void> => {
        if (message.code === BattleRoyaleCode.SubscribeToLobby) {
            this.#gameIdProvider.setGameId(message.gameId)
            try {
                await this.#api.getBattleRoyaleGameState(this.#gameIdProvider.getGameId())
                this.#fsm.triggerEvent(BattleRoyaleEvent.CLOSED_LOBBY)
            } catch {
                this.#fsm.triggerEvent(BattleRoyaleEvent.SUBSCRIBED_TO_LOBBY)
                const lobby = await this.#api.getLobbyData(this.#gameIdProvider.getGameId())
                this.#messageBroker.sendInternalMessage('updateLobbyData', lobby)
            }
        } else if (message.code === BattleRoyaleCode.LobbyClosed) {
            this.#fsm.triggerEvent(BattleRoyaleEvent.CLOSED_LOBBY)
            this.#messageBroker.sendInternalMessage('newRound', null)
        }
        if (message.lobby) {
            await this.#messageBroker.sendInternalMessage('updateLobbyData', message.lobby)
        }
        await this.#handleBrData(message)
    }

    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) messageBroker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.BattleRoyaleApi) api: IBattleRoyaleApi,
    ) {
        super(logger, AbyssTag.BATTLE_ROYALE_SCRIPT)
        this.#messageBroker = messageBroker
        this.#innerBroker = innerBroker
        this.#api = api
        messageBroker.createListener('requestBrLocations', 'Request BR locations', () => {
            this.#fetchFromGameServer()
        })
    }

    bindPlugins(bindFunc: interfaces.Bind): void {
        bindFunc<BattleRoyaleShowLocationsPlugin>(config.BattleRoyaleShowLocationsPlugin).to(BattleRoyaleShowLocationsPlugin)
        bindFunc<BattleRoyaleLocationSaverPlugin>(config.BattleRoyaleLocationSaverPlugin).to(BattleRoyaleLocationSaverPlugin)
    }

    bindHelpers(bindFunc: interfaces.Bind): void {
        bindFunc<BattleRoyaleGameIdProvider>(config.BattleRoyaleGameIdProvider).to(BattleRoyaleGameIdProvider).inSingletonScope()
        bindFunc<BattleRoyaleFSM>(BattleRoyaleFSM).toSelf().inSingletonScope()
    }

    protected initImpl(path: string, container: Container): void {
        this.addPlugin(container.get<BattleRoyaleShowLocationsPlugin>(config.BattleRoyaleShowLocationsPlugin))
        this.addPlugin(container.get<BattleRoyaleLocationSaverPlugin>(config.BattleRoyaleLocationSaverPlugin))
        this.#gameIdProvider = container.get<BattleRoyaleGameIdProvider>(config.BattleRoyaleGameIdProvider)
        this.#fsm = container.get<BattleRoyaleFSM>(BattleRoyaleFSM)
        this.#gameIdProvider.setGameId(this.#extractGameId(path))
        this.#listener = this.#innerBroker.createListener('wsData', '', this.#onWebsocketMessage)
        this.#fsm.resetToStart()
    }

    async #fetchFromGameServer(): Promise<void> {
        const state = await this.#api.getBattleRoyaleGameState(this.#gameIdProvider.getGameId())
        await this.#handleBrData({ battleRoyaleGameState: state })
    }

    async #handleBrData(message: Partial<BattleRoyaleWebsocketMessage>): Promise<void> {
        if (message.battleRoyaleGameState) {
           const brGameState = message.battleRoyaleGameState
            if (brGameState.gameId === this.#gameIdProvider.getGameId()) {
                if (this.#lastBrGameState === null || this.#lastBrGameState.gameId !== brGameState.gameId || brGameState.rounds.length !== this.#lastBrGameState.rounds.length) {
                    this.#lastBrGameState = Object.assign({}, brGameState)
                    await this.#messageBroker.sendInternalMessage('newRound', null)
                }
                await this.#messageBroker.sendMessage('brUpdateLocations', brGameState)
            }
        }
    }

    #extractGameId(path: string): string {
        const splits = path.split('/')
        return splits[splits.length - 1].split('?')[0]
    }

    protected deinitImpl(): void {
        if (this.#listener) {
            this.#listener.deregister()
            this.#listener = null
        }
        this.#gameIdProvider.setGameId('')
    }

    matches(path: string): boolean {
        return path.startsWith('/battle-royale/')
    }
}
