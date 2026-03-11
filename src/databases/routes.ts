import Dexie from 'dexie'
import { AbyssTag, ILogger } from 'logging/logging'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { AddPosToGameRound, GameAndRoundId, GameToRouteMapping, Route } from 'route_saving/route'
import importDbSettings from './dbutil'

const DBNAME = 'routesdb'

class DB extends Dexie {
    routes: Dexie.Table<GameToRouteMapping, [string,string]>
    constructor() {
        super(DBNAME)
        importDbSettings(DBNAME, this)
        this.routes.mapToClass(GameToRouteMapping)
    }
}

export default class Routes  {
    #db: DB
    #logger: ILogger
    constructor(broker: ContentAndBackgroundMessageBroker, logger: ILogger) {
        this.#db = new DB()
        this.#logger = logger.withTag(AbyssTag.ROUTES_DB)
        broker.createListener('goHomeInGameRoundRoute', 'Go back home in game round', (gameRound) => this.#goHome(gameRound))
        broker.createListener('addPosToGameRoundRoute', 'Add pos to game round', (gameRound) => this.#addPosToGameRound(gameRound))
        broker.createListener('queryGameRoundRoute', 'Query for game round route', ({ gameId, roundId }) => {
            if (roundId === 'all') {
                return this.#queryAllRounds(gameId)
            } else if (roundId === 'last') {
                return this.#queryLastRoute(gameId)
            }
            return this.#querySingleRoute({ gameId, roundId })
        })
    }
    async #goHome(gameRound: GameAndRoundId): Promise<void> {
        const { gameId, roundId } = gameRound
        await this.#db.transaction('rw', this.#db.routes, async () => {
            const { route } = await this.#db.routes.get([gameId, roundId])
            route.push([])
            await this.#db.routes.update([gameId, roundId], { route: route })
        })
    }

    async #addPosToGameRound(posToAdd: AddPosToGameRound): Promise<void> {
        const { gameId, roundId, pos } = posToAdd
        await this.#db.transaction('rw', this.#db.routes, async () => {
            const gameToRouteMapping = await this.#db.routes.get([gameId, roundId])
            const route = gameToRouteMapping?.route ?? [[]]
            route[route.length - 1].push(pos)
            await this.#db.routes.put({ gameId: gameId, roundId: roundId, route: route })
        })
    }

    async #querySingleRoute(gameAndRoundId: GameAndRoundId): Promise<Route | undefined> {
        try {
            this.#logger.log(`Querying route for game ${gameAndRoundId.gameId} round ${gameAndRoundId.roundId}`)
            const { route } = await this.#db.routes.get([gameAndRoundId.gameId, gameAndRoundId.roundId])
            return route
        } catch (e) {
            return undefined
        }
    }

    async #queryLastRoute(gameId: string): Promise<Route | undefined> {
        try {
            this.#logger.log(`Querying last route for game ${gameId}`)
            const routes = await this.#db.routes.where('gameId').equals(gameId).toArray()
            let route: Route = null
            let maxRoundId = '-1'
            routes.forEach((mapping) => {
                if (mapping.roundId > maxRoundId) {
                    maxRoundId = mapping.roundId
                    route = mapping.route
                }
            })
            return route
        } catch (e) {
            return undefined
        }
    }

    async #queryAllRounds(gameId: string): Promise<Route | undefined> {
        try {
            const routes = await this.#db.routes.where('gameId').equals(gameId).toArray()
            return routes.map(route => route.route).reduce((a, b) => a.concat(b), [[]])
        } catch {
            return undefined
        }
    }
    
}