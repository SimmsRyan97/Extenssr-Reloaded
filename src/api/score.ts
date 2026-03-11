import { Game } from 'api/game'

type Score = {
    gameToken: string
    playerName: string
    userId: string
    totalScore: number
    isLeader: boolean
    pinUrl: string
    game: Game
}

export default Score