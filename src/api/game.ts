/**
 * All these classes are part of the response to the /api/v3/game endpoint
 */

import { AxiosInstance } from 'axios'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'
import Score from './score'

export type LatLong = {
    lat: number
    lng: number
}

export type Bounds = {
    min: LatLong
    max: LatLong
}

export enum GameMode {
    STANDARD = 'standard',
    STREAK = 'streak'
}

export enum GameType {
    STANDARD = 'standard',
    STREAK = 'streak'
}

export enum GameState {
    STARTED = 'started',
    FINISHED = 'finished'
}

export type GameRound = {
    lat: number
    lng: number
    panoId: string | null,
    heading: number,
    pitch: number,
    zoom: number,
    streakLocationCode: string | null
}

export type RoundScore = {
    amount: string
    unit: string
    percentage: number
}

export type Distance = {
    meters: { amount: string, unit: string }
    miles: { amount: string, unit: string }
}

export type GameGuess = {
    lat: number
    lng: number
    timedOut: boolean
    timedOutWithGuess: boolean
    roundScore: RoundScore
    roundScoreInPercentage: number
    roundScoreInPoints: number
    distance: Distance
    distanceInMeters: number
    time: number
    // TODO: Add rest
}

export type GamePlayer = {
    guesses: GameGuess[]
    // TODO: Add rest
}

export type GameSettings = {
    forbidMoving: boolean
    forbidRotating: boolean
    forbidZooming: boolean
    timeLimit: number
}

export type Game = GameSettings & {
    token: string
    bounds: Bounds
    map: string
    mapName: string
    mode: GameMode
    round: number
    roundCount: number
    rounds: GameRound[]
    player: GamePlayer
    state: GameState
    type: GameType
}

export interface IGameApi {
    getGameData(gameId: string): Promise<Game>
    getHighScores(resultsId: string, offset: number, limit: number): Promise<Score[]>
    createGame(mapId: string, type: GameType, settings: GameSettings): Promise<Game>
    createCountryStreak(settings: GameSettings): Promise<Game>
    guessCountry(streakLocationCode: string, token: string, timedOut: boolean): Promise<Game>
}

@injectable()
export default class GameApi implements IGameApi {
    #client: AxiosInstance
    constructor(
        @inject(config.Client) client: AxiosInstance
    ) {
        this.#client = client
    }
    async getGameData(gameId: string): Promise<Game> {
        return (await this.#client.get<Game>(`/api/v3/games/${gameId}`)).data
    }
    async getHighScores(resultsId: string, offset: number, limit: number): Promise<Score[]> {
        return (await this.#client.get<Score[]>(`/api/v3/results/scores/${resultsId}/${offset}/${limit}`)).data
    }
    async createGame(mapId: string, type: GameType, settings: GameSettings): Promise<Game> {
        return (await this.#client.post<Game>('/api/v3/games', {
            map: mapId,
            type: type,
            timeLimit: settings.timeLimit,
            forbidMoving: settings.forbidMoving,
            forbidZooming: settings.forbidZooming,
            forbidRotating: settings.forbidRotating,
        })).data
    }
    // TODO: Add option for states streak, if anyone ends up caring.
    async createCountryStreak(settings: GameSettings): Promise<Game> {
        return (await this.#client.post<Game>('/api/v3/games/streak', {
            streakType: 'CountryStreak',
            ...settings
        })).data
    }

    async guessCountry(streakLocationCode: string, token: string, timedOut: boolean): Promise<Game> {
        return (await this.#client.post<Game>(`/api/v3/games/${token}`, {
            token,
            streakLocationCode,
            timedOut
        })).data
    }
}
