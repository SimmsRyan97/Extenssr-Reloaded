import Dexie from 'dexie'
import importDbSettings from './dbutil'
import { Game } from 'api/game'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'
import { Streak, NewSeedForStreak, GameToStreakMapping } from 'streak/streak'
import { AbyssTag, ILogger } from 'logging/logging'
import { FeatureProperties, GeoJson, GeoJsonProvider } from 'geocoding/geojson/gejson'
import GeoJsonReverseGeoCode, { FeaturePropertyParser } from 'geocoding/geojson_reverse_geocode'
import { alpha3ToAlpha2 } from 'i18n-iso-countries'
import Countries from 'i18n-iso-countries'
import LocaleData from '../../node_modules/i18n-iso-countries/langs/en.json'

Countries.registerLocale(LocaleData)

class DefaultCountriesGeoJsonProvider implements GeoJsonProvider {
    async getGeoJson(): Promise<GeoJson> {
        const response = await fetch(chrome.runtime.getURL('geojson_data/countries.geojson'))
        const text = await response.text()
        return JSON.parse(text) as GeoJson
    }   
}

class DefaultCountriesFeaturePropertyParser implements FeaturePropertyParser {
    getCodeAndName(properties: FeatureProperties): [string, string] {
        const threeCode = properties['ISO_A3']
        const code = alpha3ToAlpha2(threeCode)
        const name = Countries.getName(code, 'en')
        return [code, name]
    }
}

const DBNAME = 'streaksdb'

class DB extends Dexie {
    streaks: Dexie.Table<Streak, number>
    games: Dexie.Table<GameToStreakMapping, string>

    constructor() {
        super(DBNAME)
        importDbSettings(DBNAME, this)
        this.streaks.mapToClass(Streak)
        this.games.mapToClass(GameToStreakMapping)
    }
}

export default class Streaks {
    db: DB

    #logger: ILogger
    #geocode: GeoJsonReverseGeoCode

    constructor(broker: ContentAndBackgroundMessageBroker, storage: ChromeStorage, logger: ILogger) {
        this.db = new DB()

        this.#logger = logger.withTag(AbyssTag.STREAKS_HANDLER)
        this.#geocode = new GeoJsonReverseGeoCode(new DefaultCountriesGeoJsonProvider(), new DefaultCountriesFeaturePropertyParser())
        broker.createListener('startStreak', 'Start streaks', (game) => this.#startNewStreak(game))
        broker.createListener('queryStreak', 'Query streaks', (gameId) => this.#queryStreak(gameId))
        broker.createListener('streakRoundEnd', 'Streak round end', (game) => this.#roundEnd(game))
        broker.createListener('streakNextSeed', 'Next seed in streaks', (data) => this.#nextSeed(data))
        broker.createListener('getBounds', 'Get country bounds', (data) => this.#geocode.getBoundary(data))
        broker.createListener('getCodeBounds', 'Get bounds for codes', (codes) => this.#geocode.getCodeBoundaries(codes))
    }

    async #startNewStreak(game: Game): Promise<void> {
        const streak: Streak = {
            games: [{ gameId: game.token, rounds: [] }],
            mapId: game.map,
            settings: {
                forbidMoving: game.forbidMoving,
                forbidZooming: game.forbidZooming,
                forbidRotating: game.forbidRotating,
                timeLimit: game.timeLimit,
            }
        }

        await this.db.transaction('rw', [this.db.streaks, this.db.games], async () => {
            const streakId = await this.db.streaks.put(streak)
            await this.db.games.put({ gameId: game.token, streakId: streakId })
        })
    }

    async #queryStreak(gameId: string): Promise<Streak | undefined> {
        try {
            const streak = await this.db.transaction('r', [this.db.streaks, this.db.games], async () => {
                const gameToStreakMapping: GameToStreakMapping = await this.db.games.get(gameId)
                const streak: Streak = await this.db.streaks.get(gameToStreakMapping.streakId)
                this.#logger.log(`Query for ${gameId} returned ${JSON.stringify(streak)}`)
                return streak
            })
            return streak
        } catch (e) {
            return undefined
        }
    }

    async #roundEnd(game: Game): Promise<Streak | undefined> {
        try {
            this.#logger.log(`Ending round for for gameId ${game.token}`)

            const numPlayedRounds = (game.player.guesses ?? []).length
            const latestRound = game.rounds[numPlayedRounds - 1]
            const latestGuess = game.player.guesses[numPlayedRounds - 1]
            const [targetCode, targetCountryName] = await this.#geocode.getCodeAndName(latestRound.lat, latestRound.lng)
            const [guessCode, guessCountryName] = await this.#geocode.getCodeAndName(latestGuess.lat, latestGuess.lng)

            const streak = await this.db.transaction('rw', [this.db.streaks, this.db.games], async () => {
                const { streakId } = await this.db.games.get(game.token)
                const streak = await this.db.streaks.get(streakId)
                const numGames = streak.games.length
                const lastGame = streak.games[numGames - 1]
                if (lastGame.rounds.length >= numPlayedRounds) {
                    return streak
                }
                lastGame.rounds.push({
                    guess: {
                        lat: latestGuess.lat,
                        lng: latestGuess.lng,
                    },
                    guessCode: guessCode,
                    guessCountryName: guessCountryName,
                    target: {
                        lat: latestRound.lat,
                        lng: latestRound.lng,
                    },
                    targetCode: targetCode,
                    targetCountryName: targetCountryName,
                })
                this.#logger.log(`Got streak ${JSON.stringify(streak)}`)
                await this.db.streaks.put(streak)
                return streak
            })
            return streak
        } catch (e) {
            this.#logger.log(`Ending round for for gameId ${game.token} failed with ${e}`)
            return undefined
        }
    }

    async #nextSeed(data: NewSeedForStreak): Promise<void> {
        const { streakId, newGame } = data
        try {
            await this.db.transaction('rw', [this.db.games, this.db.streaks], async () => {
                const streak = await this.db.streaks.get(streakId)
                streak.games.push({
                    gameId: data.newGame.token,
                    rounds: [],
                })
                await this.db.streaks.put(streak)
                await this.db.games.put({ gameId: newGame.token, streakId: streakId })
            })
        } catch(e) {
            this.#logger.log(`Failed to update streak ${streakId}`)
        } finally {
            this.#logger.log('Next seed sent out')
        }
    }
}