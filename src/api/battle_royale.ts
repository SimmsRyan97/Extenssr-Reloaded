import { AxiosInstance } from 'axios'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'
import WebsocketMessage from 'messaging/websocket'

export type BattleRoyaleRoundAnswer = {
    countryCode?: string;
}

export type BattleRoyaleRound = {
    roundNumber: number
    answer?: BattleRoyaleRoundAnswer
    lat: number
    lng: number
    panoId: string
    reservationWindowEndsAt: string
    startTime: string
}

export type BattleRoyaleGameState = {
    competitionId: string
    currentRoundNumber: number
    gameId: string
    guessCooldown: number
    hasGameEnded: boolean
    initialLives: number
    isDistanceGame: boolean
    isRated: boolean
    isTakingGuessReservations: false
    rounds: BattleRoyaleRound[]
    status: BattleRoyaleStatus
    version: number
    winnerPlayerId: string
}

export enum BattleRoyaleStatus {
    Ongoing = 'Ongoing',
    Finished = 'Finished',
}
/*
export type BattleRoyalePowerUp = {

}

export type BattleRoyaleCoordinateGuess = {

}
*/
export type BattleRoyaleCountryGuess = {
    // cooldownEndsAt: any
    countryCode: string
    created: string
    id: string
    isReservation: boolean
    roundNumber: number
    wasCorrect: boolean
}

export type BattleRoyalePlayer = {
    // availablePowerUps: BattleRoyalePowerUp[]
    // consumedPowerUps: BattleRoyalePowerUp[]
    // coordinateGuesses: BattleRoyaleCoordinateGuess[]
    countryGuesses: BattleRoyaleCountryGuess[]
    // earnedLives: any[]
    // guesses: any[]
    knockedOutOrdinal: number
    knockedoutAtRound: number
    knockedOutReason: string // TODO: make into enum
    life: number
    playerId: string
    playerState: string // TODO: make into enum
}

export enum BattleRoyalePlayerState {
    Qualified = 'Qualified',
    KnockedOut = 'KnockedOut',
}

export enum BattleRoyaleCode {
    ConnectionOpened = 'ConnectionOpened',
    ConnectionClosed = 'ConnectionClosed',
    PlayerJoinedLobby = 'PlayerJoinedLobby',
    PlayerLeftLobby = 'PlayerLeftLobby',
    LobbyClosed = 'LobbyClosed',
    NewRound = 'NewRound',
    GuessReservation = 'GuessReservation',
    PlayerGuessed = 'PlayerGuessed',
    PlayerRevealedPowerUp = 'PlayerRevealedPowerUp',
    SubscribeToLobby = 'SubscribeToLobby',
}
export type BattleRoyaleLobbyPlayerData = {
    playerId: string
    avatarPath: string
    nick: string
}
export type BattleRoyaleGameOptions = {
    extraLivesEachRound: number
    firstRoundStartDelay: number
    forbidMoving: boolean
    forbidRotating: boolean
    forbidZooming: boolean
    guessCooldown: number
    initialLives: number
    isDistanceGame: boolean
    mapSlug: string
    powerUp5050: boolean
    powerUpSpy: boolean
    reservationWindowTime: number
    resetLivesEachRound: boolean
    roundStartDelay: number
    roundTime: number
}
export type BattleRoyaleLobby = {
    gameLobbyId?: string
    canBeStartedManually?: boolean
    gameOptions?: BattleRoyaleGameOptions
    players?: BattleRoyaleLobbyPlayerData[]
    host?: {playerId: string, nick: string}
}

export type BattleRoyaleWebsocketMessage = WebsocketMessage & {
    battleRoyaleGameState?: BattleRoyaleGameState
    gameId: string
    playerId: string
    payload?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    timestamp?: string
    lobby?: BattleRoyaleLobby
}

export interface IBattleRoyaleApi {
    getBattleRoyaleGameState(battleRoyaleId: string): Promise<BattleRoyaleGameState>
    guessCountry(gameId: string, countryCode: string, roundNumber: number): Promise<void>
    getLobbyData(gameId: string): Promise<BattleRoyaleLobby>
    setGameOptions(gameId: string, options: BattleRoyaleGameOptions): Promise<BattleRoyaleGameOptions>
}

@injectable()
export class BattleRoyaleApi implements IBattleRoyaleApi {
    #client: AxiosInstance
    constructor(
        @inject(config.GameServerClient) client: AxiosInstance
    ) {
        this.#client = client
    }
    async getBattleRoyaleGameState(battleRoyaleId: string): Promise<BattleRoyaleGameState> {
        const response = await this.#client.get<BattleRoyaleGameState>(`/api/battle-royale/${battleRoyaleId}`, { withCredentials: true })
        if (response.status !== 200) {
            throw 'Invalid response :('
        }
        return response.data
    }
    async guessCountry(gameId: string, countryCode: string, roundNumber: number): Promise<void> {
        return this.#client.post(`/api/battle-royale/${gameId}/guess`, { 'countryCode': countryCode, 'roundNumber': roundNumber }, { withCredentials: true })
    }
    async getLobbyData(gameId: string): Promise<BattleRoyaleLobby> {
        return (await this.#client.get<BattleRoyaleLobby>(`/api/lobby/${gameId}`, { withCredentials: true} )).data
    }
    async setGameOptions(gameId: string, options: BattleRoyaleGameOptions): Promise<BattleRoyaleGameOptions> {
        return (await this.#client.put<BattleRoyaleGameOptions>(`/api/lobby/${gameId}/options`, options, { withCredentials: true })).data
    }
}
