import { ITimeProvider, LRU } from './lru_cache'
class Empty {}
type MapType = {[key: string]: Empty}


class ConstantTimeProvider implements ITimeProvider {
    now(): number { return 420 }
}

class MonotonicTimeProvider implements ITimeProvider {
    d: number
    constructor() {
        this.d = 0
    }
    now(): number { 
        return this.d++
    }
}

describe('LRU cache tests', () => {
    it('cache gets purged when exceeding size', () => {
        const cache: LRU<MapType> = new LRU({}, {maxElements: 2, maxKeepAlive: 0}, new ConstantTimeProvider())
        expect(cache.setVal('a',{})).toEqual({})
        expect(cache.setVal('b', {})).toEqual({})
        const removed = cache.setVal('c', {})
        expect(Object.keys(removed).length).toBe(1)
    })
    it('oldest element gets purged when exceeding size', () => {
        const cache: LRU<MapType> = new LRU({}, {maxElements: 2, maxKeepAlive: 0}, new MonotonicTimeProvider())
        expect(cache.setVal('a',{})).toEqual({})
        expect(cache.setVal('b', {})).toEqual({})
        expect(cache.setVal('c', {})).toEqual({a: {timestamp: 0}})
    })
})