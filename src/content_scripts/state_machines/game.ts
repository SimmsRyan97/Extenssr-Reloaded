import { FSM } from 'content/state_machines/fsm'
import { injectable } from 'inversify'

export enum GameScriptState {
    LOADING = 'loading',
    LOADED = 'loaded',
    /** Pre-game screen on challenge links.  */
    JOIN_CHALLENGE = 'join-challenge',
    /** Looking at the street view. */
    GUESS = 'guess',
    /** Result screen for individual rounds. */
    ROUND_RESULT = 'round-result',
    /** Result screen for the whole game, showing total points and EXP earned. */
    FINAL_RESULT = 'final-result',
    /** Mid-game screen asking free accounts to become paying subscribers.  */
    INTERSTITIAL = 'interstitial',
}

export enum GameScriptEvent {
    FINISHED_LOADING = 'finished-loading',
    INFER_JOIN_CHALLENGE = 'infer-join-challenge',
    INFER_GUESS = 'infer-guess',
    INFER_ROUND_RESULT = 'infer-round-result',
    INFER_FINAL_RESULT = 'infer-final-result',
    INFER_INTERSTITIAL = 'infer-interstitial',
}

@injectable()
export class GameFSM extends FSM<GameScriptState, GameScriptEvent> {
    constructor() {
        super(GameScriptState.LOADING,
            new FSM.TransitionsBuilder<GameScriptState, GameScriptEvent>()
                .addTransition(GameScriptState.LOADING, GameScriptEvent.FINISHED_LOADING, GameScriptState.LOADED)
                .addTransition(GameScriptState.LOADED, GameScriptEvent.INFER_JOIN_CHALLENGE, GameScriptState.JOIN_CHALLENGE)
                .addTransition(GameScriptState.LOADED, GameScriptEvent.INFER_GUESS, GameScriptState.GUESS)
                .addTransition(GameScriptState.GUESS, GameScriptEvent.INFER_ROUND_RESULT, GameScriptState.ROUND_RESULT)
                .addTransition(GameScriptState.GUESS, GameScriptEvent.INFER_INTERSTITIAL, GameScriptState.INTERSTITIAL)
                .addTransition(GameScriptState.INTERSTITIAL, GameScriptEvent.INFER_ROUND_RESULT, GameScriptState.ROUND_RESULT)
                .addTransition(GameScriptState.LOADED, GameScriptEvent.INFER_ROUND_RESULT, GameScriptState.ROUND_RESULT)
                .addTransition(GameScriptState.LOADED, GameScriptEvent.INFER_JOIN_CHALLENGE, GameScriptState.JOIN_CHALLENGE)
                .addTransition(GameScriptState.ROUND_RESULT, GameScriptEvent.INFER_FINAL_RESULT, GameScriptState.FINAL_RESULT)
                .build())
    }
}
