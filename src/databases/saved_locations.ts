import { BattleRoyaleGameState } from 'api/battle_royale'
import Dexie from 'dexie'
import { LocationSource, SavedLocation, SourceType } from 'location_saving/location'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import importDbSettings from './dbutil'

const DBNAME = 'savedlocationsdb'

export class Screenshot {
    locationId: number
    image: Blob
}

export class ScreenshotDTO {
    locationId: number
    imageData: Uint8Array
}

class DB extends Dexie {
    savedlocations: Dexie.Table<SavedLocation, number>
    screenshots: Dexie.Table<Screenshot, number>
    constructor() {
        super(DBNAME)
        importDbSettings(DBNAME, this)
        this.savedlocations.mapToClass(SavedLocation)
        this.screenshots.mapToClass(Screenshot)
    }
}

export default class SavedLocations {
    #db: DB
    #broker: ContentAndBackgroundMessageBroker

    constructor(broker: ContentAndBackgroundMessageBroker) {
        this.#broker = broker
        this.#db = new DB()
        broker.createListener('brUpdateLocations', 'Listen for updates to locations', (brData: BattleRoyaleGameState) => {
            this.unlockLocation({
                type: SourceType.BR,
                gameId: brData.gameId,
                roundId: Math.max(0, brData.rounds.length - 1 + (brData.hasGameEnded ? 1 : 0)),
                mapName: '',
            })
        })
        broker.createListener('getUnlockedLocations', 'Get unlocked locations', () => this.getUnlockedLocations())
        broker.createListener('addLocation', 'Add saved location', (location) => this.addLocation(location))
        broker.createListener('addScreenshot', 'Add screenshot for location', (screenshot) => this.addScreenshot(screenshot))
        broker.createListener('deleteLocation', 'Delete saved location', (location) => this.deleteLocation(location))
        broker.createListener('getScreenshotForLocationId', 'Get screenshot for location', (location) => this.getScreenshotForLocationId(location))
        broker.createListener('unlockLocation', 'Unlock location', (location) => this.unlockLocation(location))
    }

    async addLocation(location: SavedLocation): Promise<number> {
        try {
            return this.#db.savedlocations.put(location)
        } catch (e) {
            return -1
        }
    }

    async addScreenshot(screenshot: ScreenshotDTO): Promise<void> {
        const imageData = screenshot.imageData as object
        const data = new Uint8Array(Array.from([...Array(Object.keys(imageData).length)].keys()).map(idx => screenshot.imageData[idx]))
        const image = new Blob([data])
        await this.#db.screenshots.put({locationId: screenshot.locationId, image})
        this.#broker.sendMessage('notifyScreenshotForLocationId', screenshot.locationId)
    }

    async unlockLocation(source: LocationSource): Promise<void> {
        await this.#db.transaction('rw', this.#db.savedlocations, async () => {
            const unlockableLocations = await this.#db.savedlocations.where('gameId').equals(source.gameId).and(location => location.locked && location.roundId <= source.roundId).toArray()
            unlockableLocations.forEach(savedLocation => savedLocation.locked = 0)
            await this.#db.savedlocations.bulkPut(unlockableLocations)
        })
        this.#broker.sendMessage('notifyUpdateLocations', null)
    }

    async deleteLocation(location: SavedLocation): Promise<void> { 
        await this.#db.transaction('rw', [this.#db.savedlocations, this.#db.screenshots], async () => {
            await Promise.all([
                this.#db.savedlocations.delete(location.id),
                this.#db.screenshots.delete(location.id)
            ])
        })
    }

    async getUnlockedLocations(): Promise<SavedLocation[]> {
        return this.#db.savedlocations.where('locked').equals(0).sortBy('id')
    }

    async getScreenshotForLocationId(locationId: number): Promise<ScreenshotDTO | undefined> {
        const screenShot = (await this.#db.screenshots.get(locationId))?.image || new Blob([])
        const arrayBuffer = await screenShot.arrayBuffer()
        return { locationId, imageData: new Uint8Array(arrayBuffer)}
    }
}