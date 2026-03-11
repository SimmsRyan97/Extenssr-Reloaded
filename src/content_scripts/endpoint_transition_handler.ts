import whenDomReady from 'when-dom-ready'
import { AbyssTag, ILogger } from 'logging/logging'
import {IEndpointScript} from 'content/endpoints/content_script'
import BattleRoyaleScript from 'content/endpoints/battle_royale_script'
import { Container, inject, injectable } from 'inversify'
import config from '../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'
import { IApiProvider } from 'api/api_provider'
import { IGameApi } from 'api/game'
import { IBattleRoyaleApi } from 'api/battle_royale'
import { IMapsApi } from 'api/maps'
import GameScript from './endpoints/game_script'
import ChallengeScript from './endpoints/challenge_script'
import MapScript from './endpoints/map_script'
import MapMakerScript from './endpoints/map_maker_script'
import MenuItemsPlugin from './plugins/global/menu_items_plugin'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
import RandomizerPlugin from './plugins/global/randomizer_plugin'
import BlinkModePlugin from './plugins/global/blink_mode_plugin'
import { IPartyApi } from 'api/party'

export interface GlobalPlugin {
  init?(): void
  onPathChange?(path: string): void
}

/**
 * Handles transitions between pages.
 * Geoguessr is a single-page application, so the content script should mostly be loaded only once
 * per tab, except in the case of a manual refresh or back button
 * press.
 */
@injectable()
export default class EndpointTransitionHandler {
    #currEndpointScript?: IEndpointScript = null
    #endpointScripts: IEndpointScript[] = []
    #globalPlugins: GlobalPlugin[] = []
    #container: Container
    readonly logger: ILogger
    constructor(
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.ApiProvider) apiProvider: IApiProvider,
        @inject(config.BaseLogger) baseLogger: ILogger,
    ) {
        const container = new Container({ skipBaseClassChecks: true })

        container.bind<ContentAndBackgroundMessageBroker>(config.ContentAndBackgroundMessageBroker).toConstantValue(broker)
        container.bind<ChromeContentToInjectedBroker>(config.ChromeContentToInjectedBroker).toConstantValue(innerBroker)
        container.bind<ChromeStorage>(config.ChromeStorage).toConstantValue(storage)

        container.bind<ILogger>(config.BaseLogger).toConstantValue(baseLogger)

        container.bind<IGameApi>(config.GameApi).toConstantValue(apiProvider.gameApi)
        container.bind<IBattleRoyaleApi>(config.BattleRoyaleApi).toConstantValue(apiProvider.battleRoyaleApi)
        container.bind<IMapsApi>(config.MapsApi).toConstantValue(apiProvider.mapsApi)
        container.bind<IPartyApi>(config.PartyApi).toConstantValue(apiProvider.partyApi)

        this.#container = container
        this.logger = baseLogger.withTag(AbyssTag.ENDPOINT_TRANSITION_HANDLER)

        this.#bindEndpoints()
        this.#bindGlobalPlugins()
        this.#addEndpoints()
        this.#addGlobalPlugins()
        this.#initGlobalPlugins()
        this.setupAsync()
    }

    #bindEndpoints(): void {
        const container = this.#container
        container.bind<BattleRoyaleScript>(config.BattleRoyaleScript).to(BattleRoyaleScript)
        container.bind<GameScript>(config.GameScript).to(GameScript)
        container.bind<ChallengeScript>(config.ChallengeScript).to(ChallengeScript)
        container.bind<MapScript>(config.MapScript).to(MapScript)
        container.bind<MapMakerScript>(config.MapMakerScript).to(MapMakerScript)
    }

    #bindGlobalPlugins(): void {
        const container = this.#container
        container.bind<MenuItemsPlugin>(config.MenuItemsPlugin).to(MenuItemsPlugin).inSingletonScope()
        container.bind<BlinkModePlugin>(config.BlinkModePlugin).to(BlinkModePlugin).inSingletonScope()
        container.bind<RandomizerPlugin>(config.RandomizerPlugin).to(RandomizerPlugin).inSingletonScope()
    }

    #addEndpoints(): void {
        const container = this.#container
        this.#endpointScripts.push(container.get<BattleRoyaleScript>(config.BattleRoyaleScript))
        this.#endpointScripts.push(container.get<GameScript>(config.GameScript))
        this.#endpointScripts.push(container.get<ChallengeScript>(config.ChallengeScript))
        this.#endpointScripts.push(container.get<MapScript>(config.MapScript))
        this.#endpointScripts.push(container.get<MapMakerScript>(config.MapMakerScript))
    }

    #addGlobalPlugins(): void {
        const container = this.#container
        this.#globalPlugins.push(container.get<MenuItemsPlugin>(config.MenuItemsPlugin))
        this.#globalPlugins.push(container.get<BlinkModePlugin>(config.BlinkModePlugin))
        this.#globalPlugins.push(container.get<RandomizerPlugin>(config.RandomizerPlugin))
    }

    async #initGlobalPlugins(): Promise<void> {
        this.#globalPlugins.forEach(plugin => plugin.init?.())
    }

    // Made non-private for testing purposes.
    async setupAsync(): Promise<void> {        
        await whenDomReady()
        const pathChange = () => this.onPathChange(window.location.pathname)
        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            for (const mutation of mutations) {
                for (const addition of mutation.addedNodes) {
                    if (addition.nodeType !== Node.ELEMENT_NODE) {
                        continue
                    }
                    const element = addition as HTMLElement
                    if (element && element.getAttribute('property') === 'og:url') {
                        pathChange()
                        return
                    }
                }
            }
        })
        observer.observe(document.head, {
            childList: true,
            subtree: true,
        })
        pathChange()
    }

    onPathChange(path: string): void {
        this.logger.log(`Change in path to ${path}`)
        if (this.#currEndpointScript) {
            if (!this.#currEndpointScript.matches(path)) {
                this.#currEndpointScript.deinit(this.#container)
            } else {
                this.#currEndpointScript.onNewPath(path)
                return
            }
        }
        for (const plugin of this.#globalPlugins) {
            plugin.onPathChange?.call(plugin, path)
        }
        for (const script of this.#endpointScripts) {
            if (script.matches(path)) {
                this.#currEndpointScript = script
                script.init(path, this.#container)
                return
            }
        }
        this.#currEndpointScript = null
    }
}
