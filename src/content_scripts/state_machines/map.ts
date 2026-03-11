import { FSM } from 'content/state_machines/fsm'
import { injectable } from 'inversify'

export enum MapState {
    // /map/<map_id>/play endpoint, waiting to select a game type
    START_GAME = 'start-game',
    // /map/<map_id>/play endpoint, but after selecting a challenge
    START_CHALLENGE = 'start-challenge',
}


export enum MapEvent {
    SELECT_GAME_TYPE = 'select-game-type',
    CREATED_CHALLENGE = 'created-challenge',
}

@injectable()
export class MapFSM extends FSM<MapState, MapEvent> {
    constructor() {
        super(MapState.START_GAME,
            new FSM.TransitionsBuilder<MapState, MapEvent>()
                .addTransition(MapState.START_GAME, MapEvent.CREATED_CHALLENGE, MapState.START_CHALLENGE)
                .addTransition(MapState.START_GAME, MapEvent.SELECT_GAME_TYPE, MapState.START_GAME)
                .build())
    }
}
