export type Timed<TKeyVal> = {[K in keyof TKeyVal]?: TKeyVal[K] & {timestamp?: number} }


export interface ITimeProvider {
    now(): number
}

export class DefaultTimeProvider implements ITimeProvider{
    now(): number {
        return Date.now()
    }
}

export class LRUSettings {
    maxKeepAlive: number = 7 * 24 * 3600 * 1000 // default is a week, 0 means no time constraint
    maxElements = 0 // don't constrain number of elements
}
type SortEntryKey<TKeyVal> = {key: keyof TKeyVal, timestamp?: number}
export class LRU<TKeyVal> {
    cache: Timed<TKeyVal> = {}
    timeProvider: ITimeProvider
    settings: LRUSettings
    constructor(cache: TKeyVal, settings: LRUSettings = new LRUSettings(), timeProvider: ITimeProvider = new DefaultTimeProvider()) {
        this.cache = cache
        this.settings = settings
        this.timeProvider = timeProvider
        for (const key in this.cache) {
            const val = this.cache[key]
            if (!val.timestamp) {
                val.timestamp = this.timeProvider.now()
            }
        }
    }

    garbageCollect(): Partial<TKeyVal> {
        const collected: Partial<TKeyVal> = {}
        const now = this.timeProvider.now()
        const sortedKeys: SortEntryKey<TKeyVal>[] = []
        for (const key in this.cache) {
            sortedKeys.push({key: key, timestamp: this.cache[key].timestamp ?? now })
        }
        sortedKeys.sort((a, b) => {
            return b.timestamp - a.timestamp
        })
        const keep: Timed<TKeyVal> = {}
        const minTimestamp = now - this.settings.maxKeepAlive
        for (let i = 0; i < sortedKeys.length; ++i) {
            const key = sortedKeys[i]
            if ((i >= this.settings.maxElements && this.settings.maxElements > 0) || ((sortedKeys[i].timestamp < minTimestamp) && this.settings.maxKeepAlive > 0)) {
                collected[key.key] = this.cache[key.key]
            } else {
                keep[key.key] = this.cache[key.key]
            }
        }
        this.cache = keep
        return collected
    }
    hasKey<K extends keyof TKeyVal>(key: K): boolean {
        return key in this.cache
    }
    setVal<K extends keyof TKeyVal>(key: K, val: TKeyVal[K]): Partial<TKeyVal> {
        this.cache[key] = val
        this.cache[key].timestamp = this.timeProvider.now()
        return this.garbageCollect()
    }
    peekVal<K extends keyof TKeyVal>(key: K): TKeyVal[K] | null {
        return this.cache[key]
    }
    getVal<K extends keyof TKeyVal>(key: K): TKeyVal[K] {
        const val = this.cache[key]
        val.timestamp = this.timeProvider.now()
        return val
    }
    dump(): TKeyVal {
        return this.cache as TKeyVal
    }
}