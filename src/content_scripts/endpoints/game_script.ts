import EndpointScript, { StateChangeListener } from 'content/endpoints/content_script'
import { AbyssTag, ILogger } from 'logging/logging'
import EasterEggGamePlugin from '../plugins/game/easter_egg_game_plugin'
import RouteSaverGamePlugin from '../plugins/game/route_saver_game_plugin'
import { GameFSM, GameScriptEvent, GameScriptState } from '../state_machines/game'
import LocationSaverGamePlugin from '../plugins/game/location_saver_game_plugin'
import { Container, inject, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'
import CountryStreakGamePlugin from 'content/plugins/game/country_streaks_game_plugin'
import { ChromeMessageBroker } from 'messaging/content_to_background_broker'


@injectable()
export class GameInfoProvider {
    gameId = ''
    getRoundNumber(): number {
        const streakDisplay: HTMLDivElement = document.querySelector('*[data-qa="round-number"] > div:nth-child(2)')
        if (!streakDisplay) {
            return -1
        }
        const txt = streakDisplay.innerText
        if (!txt || txt.length < 1) {
            return -1
        }
        const parts = txt.split('/')
        const trimmed = txt.split('/')[0].trim()
        try {
            return parseInt(trimmed) - (parts.length > 1 ? 1 : 0)
        } catch (e) {
            return -1
        }
    }
    getMapName(): string {
        const mapNameDiv = document.querySelector('*[data-qa="map-name"] > div + div')
        if (!mapNameDiv) {
            return 'Streak'
        }
        return mapNameDiv.textContent
    }
}

@injectable()
export class GameStateProxiesProvider {
    guessMap?: HTMLElement = null
    closeRoundResult?: HTMLElement = null
    guessDescription?: HTMLElement = null
    playMapAgainButton?: HTMLElement = null
    interstitialContinueToGameButton?: HTMLElement = null
    joinChallengeButton?: HTMLElement = null

    clear(): void {
        this.guessMap = null
        this.guessDescription = null
        this.playMapAgainButton = null
        this.closeRoundResult = null
        this.joinChallengeButton = null
    }

    update(): void {
        this.guessMap = document.querySelector('.game-layout__guess-map')
        this.guessDescription = document.querySelector('*[data-qa="guess-description"]')
        this.playMapAgainButton = document.querySelector('*[data-qa="play-same-map"], *[data-qa="play-again-button"]')
        this.closeRoundResult = document.querySelector('*[data-qa="close-round-result"]')
        this.interstitialContinueToGameButton = document.querySelector('*[data-qa="interstitial-message-continue-to-game"]')
        this.joinChallengeButton = document.querySelector('*[data-qa="join-challenge-button"]')
    }
}
/**
 * Handles everything that happens under /game/<game_id>
 */


@injectable()
export default class GameScript extends EndpointScript implements StateChangeListener<GameScriptState> {
    protected fsm: GameFSM
    protected observer: MutationObserver | null = null
    protected gameInfoProvider: GameInfoProvider
    protected gameStateProxiesProvider: GameStateProxiesProvider
    broker: ChromeMessageBroker
    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ChromeMessageBroker,

    ) {
        super(logger, AbyssTag.GAME_SCRIPT)
        this.broker = broker
    }

    bindPlugins(bindFunc: interfaces.Bind): void {
        bindFunc<LocationSaverGamePlugin>(config.LocationSaverGamePlugin).to(LocationSaverGamePlugin)
        bindFunc<RouteSaverGamePlugin>(config.RouteSaverGamePlugin).to(RouteSaverGamePlugin)
        bindFunc<CountryStreakGamePlugin>(config.CountryStreakGamePlugin).to(CountryStreakGamePlugin)
        bindFunc<EasterEggGamePlugin>(config.EasterEggGamePlugin).to(EasterEggGamePlugin)
    }

    bindHelpers(bindFunc: interfaces.Bind): void {
        bindFunc<GameInfoProvider>(config.GameInfoProvider).to(GameInfoProvider).inSingletonScope()
        bindFunc<GameStateProxiesProvider>(config.GameStateProxiesProvider).to(GameStateProxiesProvider)
        bindFunc<GameFSM>(GameFSM).toSelf().inSingletonScope()
    }

    protected initImpl(path: string, container: Container): void {
        this.addPlugin(container.get<LocationSaverGamePlugin>(config.LocationSaverGamePlugin))
        this.addPlugin(container.get<RouteSaverGamePlugin>(config.RouteSaverGamePlugin))
        this.addPlugin(container.get<CountryStreakGamePlugin>(config.CountryStreakGamePlugin))
        this.addPlugin(container.get<EasterEggGamePlugin>(config.EasterEggGamePlugin))
        this.gameStateProxiesProvider = container.get<GameStateProxiesProvider>(config.GameStateProxiesProvider)
        this.gameInfoProvider = container.get<GameInfoProvider>(config.GameInfoProvider)
        this.fsm = container.get<GameFSM>(GameFSM)
        this.fsm.addStateChangeListener(this)
        this.gameInfoProvider.gameId = path.split('/')[2]
        this.fsm.resetToStart()
    }

    onStateChange(toState: GameScriptState): void {
        this.logger.log('Changed to state ' + toState)
        if (toState === GameScriptState.LOADING) {
            const panorama = document.querySelector('.game-layout__panorama')
            if (!panorama) {
                return
            }
            this.observer = new MutationObserver(() => {
                if (panorama.childElementCount == 1) {
                    this.fsm.triggerEvent(GameScriptEvent.FINISHED_LOADING)
                }
            })
            this.observer.observe(panorama, { childList: true, subtree: true })
        } else if (toState === GameScriptState.LOADED) {
            this.observer?.disconnect()
            this.observer = null
            this.#handlePostLoadedState()
        }
        if (toState === GameScriptState.GUESS) {
            this.broker.sendInternalMessage('newRound', null)
        }
    }

    #detectRoundResult(): void {
        if (document.querySelector('*[data-qa="result-view-bottom"] > div > div')) {
            this.observer?.disconnect()
            this.observer = null
            this.fsm.triggerEvent(GameScriptEvent.INFER_ROUND_RESULT)
            this.#waitForNextRoundOrFinalResult()
        }
    }

    #waitForRoundResultOrInterstitial(): void {
        const main = document.querySelector('main')
        if (!main) {
            return
        }
        this.observer = new MutationObserver(() => {
            this.gameStateProxiesProvider.update()
            // TODO: Consolidate this into a proper state proxy
            this.#detectRoundResult()
            if (this.gameStateProxiesProvider.interstitialContinueToGameButton) {
                this.observer?.disconnect()
                this.observer = null
                this.fsm.triggerEvent(GameScriptEvent.INFER_INTERSTITIAL)
                this.#waitForInterstitialContinue()
            }
        })
        // We can only look at the childList because the result view is inserted
        // as a second element in `main`. If the whole thing suddenly breaks after a
        // GeoGuessr update, adding `subtree: true` here might help.
        // During rounds, the DOM changes a lot because of the street view and the map,
        // so if we can avoid doing work there we should!
        this.observer.observe(main, { childList: true })
    }

    #waitForInterstitialContinue(): void {
        const main = document.querySelector('main')
        if (!main) {
            return
        }
        this.observer = new MutationObserver(() => {
            this.gameStateProxiesProvider.update()
            this.#detectRoundResult()
        })
        this.observer.observe(main, { childList: true, subtree: true })
    }

    #waitForNextRoundOrFinalResult(): void {
        this.logger.log('Wait for loading or final result')
        const game_layout = document.querySelector('.game-layout + div')
        if (!game_layout) {
            return
        }
        // TODO maybe we can use `next-round-result`.onclick here?
        const cb = () => {
            this.gameStateProxiesProvider.update()
            if (this.gameStateProxiesProvider.playMapAgainButton) {
                this.observer?.disconnect()
                this.observer = null
                this.fsm.triggerEvent(GameScriptEvent.INFER_FINAL_RESULT)
            } else {
                const panorama = document.querySelector('.game-layout__panorama')
                if (panorama && !this.gameStateProxiesProvider.closeRoundResult) {
                    this.observer?.disconnect()
                    this.observer = null
                    this.fsm.resetToStart()
                }
            }
        }
        this.observer = new MutationObserver(() => cb())
        this.observer.observe(game_layout, { childList: true, subtree: true })
        cb()
    }

    #handlePostLoadedState(): void {
        this.gameStateProxiesProvider.update()
        if (this.gameStateProxiesProvider.guessMap?.childElementCount) {
            this.fsm.triggerEvent(GameScriptEvent.INFER_GUESS)
            this.#waitForRoundResultOrInterstitial()
        } else if (this.gameStateProxiesProvider.guessDescription) {
            this.fsm.triggerEvent(GameScriptEvent.INFER_ROUND_RESULT)
            this.#waitForNextRoundOrFinalResult()
        }
    }

    matches(path: string): boolean {
        return path.startsWith('/game/')
    }

    protected deinitImpl(): void {
        this.observer?.disconnect()
        this.observer = null
    }
}
