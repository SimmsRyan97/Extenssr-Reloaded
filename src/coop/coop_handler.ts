import { DefaultTimeProvider, LRU } from 'storage/lru_cache'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'
import { CoopModesById, SetCoopMode } from './coop'

export class CoopHandler {
    #storage: ChromeStorage
    #coopModesById?: LRU<CoopModesById>

    constructor(storage: ChromeStorage, broker: ContentAndBackgroundMessageBroker) {
        this.#storage = storage

        broker.createListener('setCoopMode', 'Set the coop mode for a game', async (round) => {
            if (!this.#coopModesById) {
                await this.#loadCoopModes()
            }

            this.#setCoopMode(round)
        })
    }

    async #loadCoopModes(): Promise<void>{
        let val = await this.#storage.getValue('coopMode')
        // A beta version of the extension used to store {gameId: modeString} directly,
        // without LRU wrapping. Some people used that beta version so they have invalid data
        // in their storage. If we find such data we ignore it.
        if (Object.values(val).some((mode) => typeof mode === 'string')) {
            val = {}
        }

        this.#coopModesById = new LRU(val, {
            // It would require a lot of dedication to do more than 100 coop games in one month :)
            maxElements: 100,
            maxKeepAlive: 31 * 24 * 3600 * 1000,
        }, new DefaultTimeProvider())
    }

    #setCoopMode(round: SetCoopMode): void {
        const { mode, gameId } = round
        this.#coopModesById.setVal(gameId, { mode })
        this.#storage.setValue('coopMode', this.#coopModesById.dump())
    }
}
