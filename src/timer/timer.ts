export class RoundTiming {
    readonly gameId: string
    readonly roundId: number
    readonly startTime: number
    endTime: number | null = null
    waitDuration: number | null = null
    score: number | null = null

    constructor (gameId: string, roundId: number, startTime: number) {
        this.gameId = gameId
        this.roundId = roundId
        this.startTime = startTime
    }
}
