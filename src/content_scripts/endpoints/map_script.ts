import EndpointScript from 'content/endpoints/content_script'
import { AbyssTag, ILogger } from 'logging/logging'
import CountryStreaksMapPlugin from 'content/plugins/map/country_streaks_map_plugin'
import CoopMapPlugin from 'content/plugins/map/coop_map_plugin'
import { MapEvent, MapFSM } from 'content/state_machines/map'
import { Container, inject, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'

@injectable()
export class MapInfoProvider {
    mapId = ''
}

@injectable()
export class MapStateProxiesProvider {
    getStartButton(): HTMLButtonElement {
        return document.querySelector('.game-settings__section > button') as HTMLButtonElement
    }

    getStartChallengeButton(): HTMLButtonElement | null {
        return document.querySelector('*[data-qa="start-challenge-button"]') as HTMLButtonElement
    }

    getSinglePlayerButton(): HTMLButtonElement | null {
        return document.querySelector('*[data-qa="game-type-single-player"]') as HTMLButtonElement
    }

    getStartGameButton(): HTMLButtonElement | null {
        return document.querySelector('*[data-qa="start-game-button"]') as HTMLButtonElement
    }

    getChallengeButton(): HTMLButtonElement | null {
        return document.querySelector('*[data-qa="game-type-challenge"]') as HTMLButtonElement
    }

    getSettingsCheckbox(): HTMLElement | null {
        return document.querySelector('.game-settings__checkbox')
    }
}

@injectable()
export default class MapScript extends EndpointScript {
    #fsm: MapFSM
    #stateProxiesProvider: MapStateProxiesProvider
    #gameTypeObserver = new MutationObserver(() => {
        this.#recheckStateProxies()
    })
    #mapInfoProvider: MapInfoProvider

    // Detect changes in selected game mode by comparing radio button class names over time.
    #radioClassNames: string[] = []

    constructor(
        @inject(config.BaseLogger) logger: ILogger,
    ) {
        super(logger, AbyssTag.MAP_SCRIPT)
    }

    bindPlugins(bindFunc: interfaces.Bind): void {
        bindFunc<CountryStreaksMapPlugin>(config.CountryStreaksMapPlugin).to(CountryStreaksMapPlugin)
        bindFunc<CoopMapPlugin>(config.CoopMapPlugin).to(CoopMapPlugin)
    }

    bindHelpers(bindFunc: interfaces.Bind): void {
        bindFunc<MapStateProxiesProvider>(config.MapStateProxiesProvider).to(MapStateProxiesProvider).inSingletonScope()
        bindFunc<MapFSM>(MapFSM).toSelf().inSingletonScope()
        bindFunc<MapInfoProvider>(config.MapInfoProvider).to(MapInfoProvider).inSingletonScope()
    }

    protected initImpl(path: string, container: Container): void {
        this.addPlugin(container.get<CountryStreaksMapPlugin>(config.CountryStreaksMapPlugin))
        this.addPlugin(container.get<CoopMapPlugin>(config.CoopMapPlugin))

        this.#fsm = container.get<MapFSM>(MapFSM)
        this.#stateProxiesProvider = container.get<MapStateProxiesProvider>(config.MapStateProxiesProvider)
        this.#mapInfoProvider = container.get<MapInfoProvider>(config.MapInfoProvider)
        this.#fsm.resetToStart()
        this.#mapInfoProvider.mapId = path.split('/')[2]
        const layout_main = document.querySelector('main')
        this.#gameTypeObserver.observe(layout_main, {
            childList: true,
            subtree: true,
            attributes: true,
        })
        this.#recheckStateProxies()
    }

    protected deinitImpl(): void {
        this.#gameTypeObserver.disconnect()
    }

    matches(path: string): boolean {
        return path.startsWith('/maps/') && path.endsWith('/play')
    }

    #recheckStateProxies(): void {
        const singlePlayerButton = this.#stateProxiesProvider.getSinglePlayerButton()
        if (singlePlayerButton) {
            const newClassNames = [...singlePlayerButton.parentNode.children].map((element) => element.className)
            if (this.#radioClassNames.length !== newClassNames.length || this.#radioClassNames.some((className, index) => className !== newClassNames[index])) {
                this.#fsm.triggerEvent(MapEvent.SELECT_GAME_TYPE)
                this.#radioClassNames = newClassNames
            }
        }
        if (this.#stateProxiesProvider.getStartChallengeButton()) {
            this.#fsm.triggerEvent(MapEvent.CREATED_CHALLENGE)
            this.#gameTypeObserver.disconnect()
        }
    }
}
