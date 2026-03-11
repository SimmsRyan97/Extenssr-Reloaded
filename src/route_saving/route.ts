import { LatLong } from 'api/game'

export type Route = LatLong[][]

export class GameToRouteMapping {
    gameId: string
    roundId: string
    route: Route
}
export type AddPosToGameRound = {
    gameId: string
    roundId: string
    pos: LatLong
}

export type GameAndRoundId = {
    gameId: string
    roundId: string
}
