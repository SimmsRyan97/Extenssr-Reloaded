import {CachedValueStoreClient, ValueProvider} from './value_store'

class KeyVal {
    defaultTrue = true
    defaultFalse = false
    defaultOne = 1
}

class EmptyProvider extends ValueProvider<KeyVal> {
    async getValue<T extends keyof KeyVal>(): Promise<KeyVal[T]> {
        return undefined
    }
    getValueCb<T extends keyof KeyVal>(key: T, cb: (val: KeyVal[T]) => void): void {
        cb(null)
    }
}

class OppositeProvider extends ValueProvider<KeyVal> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oppositeValues: Map<keyof KeyVal, any> = new Map()
    constructor() {
        super()
        this.oppositeValues.set('defaultTrue', false)
        this.oppositeValues.set('defaultFalse', true)
        this.oppositeValues.set('defaultOne', -1)
    }
    async getValue<T extends keyof KeyVal>(key: T): Promise<KeyVal[T]> {
        return this.oppositeValues.get(key)
    }
    getValueCb<T extends keyof KeyVal>(key: T, cb: (val: KeyVal[T]) => void): void {
        cb(this.oppositeValues.get(key))
    }
}

describe('Valuestore tests', () => {
    it('getCachedValue returns default values', () => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new EmptyProvider())
        expect(cachedValueStore.getCachedValue('defaultTrue')).toBeTruthy()
        expect(cachedValueStore.getCachedValue('defaultFalse')).toBeFalsy()
        expect(cachedValueStore.getCachedValue('defaultOne')).toBe(1)
    })
    it('getValue returns default values if provider is empty', async () => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new EmptyProvider())
        const expectedTrue = await cachedValueStore.getValue('defaultTrue')
        expect(expectedTrue).toBeTruthy()
        const expectedFalse = await cachedValueStore.getValue('defaultFalse')
        expect(expectedFalse).toBeFalsy()
        const expectedOne = await cachedValueStore.getValue('defaultOne')
        expect(expectedOne).toBe(1)
    })
    it('getValue returns opposite values if provider is opposite', async () => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new OppositeProvider())
        const expectedTrue = await cachedValueStore.getValue('defaultTrue')
        expect(expectedTrue).toBeFalsy()
        const expectedFalse = await cachedValueStore.getValue('defaultFalse')
        expect(expectedFalse).toBeTruthy()
        const expectedOne = await cachedValueStore.getValue('defaultOne')
        expect(expectedOne).toBe(-1)
    })
    it('getValue returns opposite values if provider is opposite after cache', (done) => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new OppositeProvider())
        cachedValueStore.getValueCb('defaultTrue', () => {
            expect(cachedValueStore.getCachedValue('defaultTrue')).toBeFalsy()
            cachedValueStore.getValueCb('defaultFalse', () => {
                expect(cachedValueStore.getCachedValue('defaultFalse')).toBeTruthy()
                cachedValueStore.getValueCb('defaultOne', () => {
                    expect(cachedValueStore.getCachedValue('defaultOne')).toBe(-1)
                    done()
                })
            })
        })
    })
    it('setValue on CachedValueStoreClient calls listener', async () => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new EmptyProvider())
        let times = 0
        cachedValueStore.createListener('defaultTrue', (value: boolean) => {
            if (times === 1) {
                expect(value).toBeFalsy()
            }
            times += 1
        })
        await cachedValueStore.setValue('defaultTrue', false)
        expect(times).toBe(2)
    })
    it('setValue on provider calls listener', async () => {
        const emptyProvider = new EmptyProvider()
        const cachedValueStore = new CachedValueStoreClient(KeyVal, emptyProvider)
        let times = 0
        cachedValueStore.createListener('defaultTrue', (value: boolean) => {
            if (times === 1) {
                // update
                expect(value).toBeFalsy()
            }
            times += 1
        })
        await emptyProvider.setValue('defaultTrue', false)
        expect(times).toBe(2)
    })
    it('setValue on CachedValueStoreClient no longer calls listener after it is removed', async () => {
        const cachedValueStore = new CachedValueStoreClient(KeyVal, new EmptyProvider())
        let times = 0
        const listener = cachedValueStore.createListener('defaultTrue', () => {
            if (times === 1) {
                expect(true).toBeFalsy()
            }
            times += 1
        })
        listener.deregister()
        await cachedValueStore.setValue('defaultTrue', false)
    })
    it('setValue on provider no longer calls listener after it is removed', () => {
        const emptyProvider = new EmptyProvider()
        const cachedValueStore = new CachedValueStoreClient(KeyVal, emptyProvider)
        let times = 0
        const listener = cachedValueStore.createListener('defaultTrue', () => {
            ++times
            if (times == 1) {
                return
            }
            expect(true).toBeFalsy()
        })
        listener.deregister()
        emptyProvider.setValue('defaultTrue', false)
    })
})
