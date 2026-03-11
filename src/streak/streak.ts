import { Game, GameSettings, LatLong } from 'api/game'

export type StreakGameRound = {
    target: LatLong
    targetCode: string
    targetCountryName: string
    guess: LatLong
    guessCode: string
    guessCountryName: string
}

export type StreakGame = {
    gameId: string
    rounds: StreakGameRound[]
}

export class Streak {
    streakId?: number
    mapId: string
    settings: GameSettings
    games: StreakGame[]
}

export class GameToStreakMapping {
    gameId: string
    streakId: number
}

export type NewSeedForStreak = {
    streakId: number
    newGame: Game
}

export function computeStreakSize(streak: Streak): number {
    return streak.games.map(game => game.rounds.length)
                       .reduce((a,b) => a + b)
}
