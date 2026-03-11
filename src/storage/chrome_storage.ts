import browser from 'webextension-polyfill'
import { SettingsKeys } from './storage'
import BaseStringStorage from './string_storage'
import { CachedValueStoreClient } from './value_store'

class ChromeStringStorage<TSettings> extends BaseStringStorage<TSettings>{
    constructor() {
        super()
    }
    protected async getValueImpl(key: string): Promise<string | undefined> {
        const item = await browser.storage.local.get(key)
        return item[key] as string
    }
    protected async setValueImpl(key: string, val: string) {
        await browser.storage.local.set({
            [key]: val,
        })
    }
    async clearAll() {
        await browser.storage.local.clear()
    }
}

export class BaseChromeStorage<TSettings> extends CachedValueStoreClient<TSettings> {
    constructor(ctor: new () => TSettings) {
        super(ctor, new ChromeStringStorage())
    }
}

export class ChromeStorage extends BaseChromeStorage<SettingsKeys> {
    private constructor() {
        super(SettingsKeys)
    }

    // Create a cached storage object with all the data preloaded.
    static async create(): Promise<ChromeStorage> {
        const storage = new ChromeStorage()

        const keys = Object.keys(new SettingsKeys()) as (keyof SettingsKeys)[]
        await Promise.all(keys.map((key) => storage.getValue(key)))
        return storage
    }
}
