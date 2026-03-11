import GameScript from './game_script'
import CoopChallengePlugin from 'content/plugins/challenge/coop_challenge_plugin'
import { GameScriptState, GameScriptEvent } from 'content/state_machines/game'
import { Container, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'
export { GameScriptState as ChallengeScriptState }

/**
 * Handles everything that happens under /challenge/<game_id>
 */

@injectable()
export default class ChallengeScript extends GameScript {

    bindPlugins(bindFunc: interfaces.Bind): void {
        super.bindPlugins(bindFunc)
        bindFunc<CoopChallengePlugin>(config.CoopChallengePlugin).to(CoopChallengePlugin)
    }

    protected initImpl(path: string, container: Container): void {
        this.addPlugin(container.get<CoopChallengePlugin>(config.CoopChallengePlugin))
        super.initImpl(path, container)
    }

    onStateChange(toState: GameScriptState): void {
        if (toState === GameScriptState.LOADING) {
            const panorama = document.querySelector('.game-layout__panorama')
            const main = document.querySelector('main')
            if (!panorama) {
                this.observer = new MutationObserver(() => {
                    this.gameStateProxiesProvider.update()
                    if (this.gameStateProxiesProvider.joinChallengeButton) {
                        this.fsm.triggerEvent(GameScriptEvent.FINISHED_LOADING)
                    }
                })
                if (main) {
                    this.observer.observe(main, { childList: true, subtree: true })
                }
                return
            }
        }

        if (toState === GameScriptState.JOIN_CHALLENGE) {
            this.#waitForGameStart()
            return
        }

        super.onStateChange(toState)

        if (toState === GameScriptState.LOADED) {
            if (this.gameStateProxiesProvider.joinChallengeButton) {
                this.fsm.triggerEvent(GameScriptEvent.INFER_JOIN_CHALLENGE)
            }
        }
    }

    #waitForGameStart(): void {
        const main = document.querySelector('main')
        if (!main) {
            return
        }
        this.observer = new MutationObserver(() => {
            this.gameStateProxiesProvider.update()
            if (!this.gameStateProxiesProvider.joinChallengeButton) {
                this.observer?.disconnect()
                this.observer = null
                this.fsm.resetToStart()
            }
        })
        this.observer.observe(main, { childList: true, subtree: true })
    }

    matches(path: string): boolean {
        return path.startsWith('/challenge/')
    }
}
