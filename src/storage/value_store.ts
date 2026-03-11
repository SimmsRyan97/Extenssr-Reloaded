 /* eslint-disable @typescript-eslint/no-explicit-any */
export interface ValueChangeListener<T> {
    onChange(value: T): void
    deregister(): void
}

export abstract class ValueProvider<TKeyVal> {
    #listeners: Map<keyof TKeyVal, ValueChangeListener<any>[]> = new Map()
    #invListenerMap: Map<ValueChangeListener<any>, keyof TKeyVal> = new Map()
    abstract getValue<T extends keyof TKeyVal>(key: T): Promise<TKeyVal[T] | null>
    /** @deprecated */
    abstract getValueCb<T extends keyof TKeyVal>(key: T, cb: (val: TKeyVal[T] | null) => void): void
    async setValue<T extends keyof TKeyVal>(key: T, val: TKeyVal[T]): Promise<void> {
        this.notifyAllListeners(key, val)
    }
    createListener<T extends keyof TKeyVal>(key: T, cb: (val: TKeyVal[T])=>void): ValueChangeListener<TKeyVal[T]> {
        const listener: ValueChangeListener<TKeyVal[T]> = {
            onChange: cb,
            deregister: () => this.#removeListener(listener)
        }
        this.#addListener(key, listener)
        return listener
    }
    notifyAllListeners<T extends keyof TKeyVal>(key: T, val: TKeyVal[T]): void {
        if (!this.#listeners.has(key)) {
            return
        }
        this.#listeners.get(key)?.forEach(listener => listener.onChange(val))
    }
    async clearAll(): Promise<void> {
        // override to do useful things
    }
    #addListener<T extends keyof TKeyVal>(key: T, listener: ValueChangeListener<TKeyVal[T]>): void {
        if (this.#listeners.has(key)) {
            this.#listeners.get(key)?.push(listener)
        } else {
            this.#listeners.set(key, [listener])
        }
        this.#invListenerMap.set(listener, key)
    }
    #removeListener<T extends keyof TKeyVal>(listener: ValueChangeListener<TKeyVal[T]>): void {
        if (!this.#invListenerMap.has(listener)) {
            return
        }
        const key = this.#invListenerMap.get(listener)
        if (!key) {
            return
        }
        this.#invListenerMap.delete(listener)
        const entries = this.#listeners.get(key) ?? []
        this.#listeners.set(key, entries.filter(value => value !== listener))
    }
}

export class CachedValueStoreClient<TKeyVal> {
    #cache: TKeyVal
    #storageProvider: ValueProvider<TKeyVal>
    #fetched: Set<keyof TKeyVal> = new Set()
    #brokerListeners: Array<(val: any) => void> = []
    #ctor: {new(): TKeyVal}
    constructor(ctor: {new(): TKeyVal}, provider: ValueProvider<TKeyVal>) {
        this.#cache = new ctor()
        this.#ctor = ctor
        this.#storageProvider = provider
    }
    createListener<T extends keyof TKeyVal>(key: T, cb: (val: TKeyVal[T]) => void): ValueChangeListener<TKeyVal[T]> {
        const listener = this.#storageProvider.createListener(key, cb)
        listener.onChange(this.getCachedValue(key))
        return listener
    }

    getCachedValue<T extends keyof TKeyVal>(key: T): TKeyVal[T] {
        return this.#cache[key]
    }
    async getValue<T extends keyof TKeyVal>(key: T): Promise<TKeyVal[T]> {
        if (this.#fetched.has(key)) {
            return this.#cache[key]
        }
        const val = await this.#storageProvider.getValue(key)
        this.#fetched.add(key)
        if (val == null) {
            return this.#cache[key]
        }
        this.#cache[key] = val
        return val
    }
    getValueCb<T extends keyof TKeyVal>(key: T, cb: (val: TKeyVal[T]) => void): void {
        this.getValue(key).then(cb)
    }
    addBrokerListener(cb: (val: any) => void): void {
        this.#brokerListeners.push(cb)
    }
    async setValue<T extends keyof TKeyVal>(key: T, val: TKeyVal[T]): Promise<void> {
        const msg = { [key]: val }
        this.#cache[key] = val
        this.#fetched.add(key)
        await this.#storageProvider.setValue(key, val)
        for (const listener of this.#brokerListeners) {
            listener(msg)
        }
    }
    setValueFromBroker<T extends keyof TKeyVal>(key: T, val: TKeyVal[T]): void {
        this.#cache[key] = val
        this.#fetched.add(key)
        this.#storageProvider.notifyAllListeners(key, val)
    }
    async clearAll(): Promise<void> {
        await this.#storageProvider.clearAll()
        this.#cache = new this.#ctor()
        for (const key in this.#cache) {
            this.setValue(key, this.#cache[key])
        }
    }
}

