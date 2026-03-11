import Dexie from 'dexie'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { RoundTiming } from 'timer/timer'
import importDbSettings from './dbutil'

const DBNAME = 'timingsdb'

class DB extends Dexie {
    roundtimes: Dexie.Table<RoundTiming, [string, number]>
    constructor() {
        super(DBNAME)
        importDbSettings(DBNAME, this)
        this.roundtimes.mapToClass(RoundTiming)
    }
}

export default class Timings {
    db: DB
    constructor(broker: ContentAndBackgroundMessageBroker) {
        this.db = new DB()
        broker.createListener('getRoundTiming', 'Start round timing', ([gameId, roundId]) => this.getRoundTiming(gameId, roundId))
        broker.createListener('setWaitDuration', 'Set wait duration', ([roundTiming, waiting]) => this.setWaitDuration(roundTiming, waiting))
        broker.createListener('getTimingsForGame', 'Get timings for a game id', (gameId) => this.getTimingsForGame(gameId))
        broker.createListener('startRoundTiming', 'Start timing for round',  ([gameId, roundId, startTime]) => this.startRoundTiming(gameId, roundId, startTime))
        broker.createListener('endRoundTiming', 'End timing for round',  ([gameId, roundId, startTime]) => this.endRoundTiming(gameId, roundId, startTime))
    }

    async getRoundTiming(gameId: string, roundId: number): Promise<RoundTiming | null> {
        return this.db.roundtimes.get([gameId, roundId])
    }

    /**
     * Get timings for all rounds for a game. The result may contain `null` entries for rounds that were not timed.
     */
    async getTimingsForGame(gameId: string): Promise<(RoundTiming | null)[]> {
        const results = await this.db.roundtimes.where({ gameId }).toArray()
        const highestRoundId = results.reduce((acc, round) => Math.max(acc, round.roundId), 0)
        const rounds = new Array(highestRoundId + 1).fill(null)
        for (const round of results) {
            rounds[round.roundId] = round
        }
        return rounds
    }

    async startRoundTiming(gameId: string, roundId: number, startTime: number): Promise<RoundTiming> {
        let round = await this.getRoundTiming(gameId, roundId)
        // If the round already exists, we keep the old start time.
        // That way it is still accurate if you refresh the page.
        if (!round) {
            round = new RoundTiming(gameId, roundId, startTime)
            await this.db.roundtimes.put(round)
        }
        return round
    }

    async endRoundTiming(gameId: string, roundId: number, endTime: number): Promise<RoundTiming | null> {
        const round = await this.getRoundTiming(gameId, roundId)
        if (!round) {
            // Nothing we can do
            return null
        }
        round.endTime = endTime
        await this.db.roundtimes.put(round)
        return round
    }

    async setWaitDuration(round: RoundTiming, waitDuration: number): Promise<void> {
        round.waitDuration = waitDuration
        await this.db.roundtimes.put(round)
    }
}
