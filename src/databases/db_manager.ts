import { ILogger } from 'logging/logging'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'
import Routes from './routes'
import SavedLocations from './saved_locations'
import Streaks from './streaks'
import Timings from './timings'

export default class DBManager {
    #routes: Routes
    #savedLocations: SavedLocations
    #streaks: Streaks
    #timings: Timings
    constructor(broker: ContentAndBackgroundMessageBroker, storage: ChromeStorage, logger: ILogger) {
        this.#routes = new Routes(broker, logger)
        this.#savedLocations = new SavedLocations(broker)
        this.#streaks = new Streaks(broker, storage, logger)
        this.#timings = new Timings(broker)
    }
}