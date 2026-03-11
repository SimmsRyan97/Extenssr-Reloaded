import { FSM } from 'content/state_machines/fsm'
import { injectable } from 'inversify'

export enum BattleRoyaleState {
    LOADING = 'loading',
    IN_LOBBY = 'in-lobby',
    IN_GAME = 'in-game',
}

export enum BattleRoyaleEvent {
    SUBSCRIBED_TO_LOBBY = 'subscribed-to-lobby',
    CLOSED_LOBBY = 'closed-lobby',
}
@injectable()
export class BattleRoyaleFSM extends FSM<BattleRoyaleState, BattleRoyaleEvent> {
    constructor() {
        super(BattleRoyaleState.LOADING,
            new FSM.TransitionsBuilder<BattleRoyaleState, BattleRoyaleEvent>()
                .addTransition(BattleRoyaleState.LOADING, BattleRoyaleEvent.SUBSCRIBED_TO_LOBBY, BattleRoyaleState.IN_LOBBY)
                .addTransition(BattleRoyaleState.LOADING, BattleRoyaleEvent.CLOSED_LOBBY, BattleRoyaleState.IN_GAME)
                .addTransition(BattleRoyaleState.IN_LOBBY, BattleRoyaleEvent.CLOSED_LOBBY, BattleRoyaleState.IN_GAME)
                .addTransition(BattleRoyaleState.IN_GAME, BattleRoyaleEvent.SUBSCRIBED_TO_LOBBY, BattleRoyaleState.IN_LOBBY)
                .build())
    }
}