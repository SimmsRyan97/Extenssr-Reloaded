import { ValueProvider } from './value_store'
/**
 * Serialise using strings
 */
export default abstract class BaseStringStorage<TKeyVal> extends ValueProvider<TKeyVal> {
    constructor() {
        super()
    }

    protected abstract getValueImpl(key: string): Promise<string | null>
    protected abstract setValueImpl(key: string, val: string): Promise<void>

    async getValue<T extends keyof TKeyVal>(key: T): Promise<TKeyVal[T] | undefined> {
        const valStr = await this.getValueImpl(key as string)
        if (valStr === undefined) {
            return
        }
        return JSON.parse(valStr) as TKeyVal[T]
    }
    getValueCb<T extends keyof TKeyVal>(key: T, cb: (val: TKeyVal[T]) => void): void {
        this.getValue(key).then(cb)
    }
    async setValue<T extends keyof TKeyVal>(key: T, val: TKeyVal[T]): Promise<void> {
        const valStr = JSON.stringify(val)
        await this.setValueImpl(key as string, valStr)
        await super.setValue(key, val)
    }
}

export class StringStorage<TKeyVal> extends BaseStringStorage<TKeyVal> {
    // Visible for testing
    data: Map<string, string> = new Map()
    protected async getValueImpl(key: string): Promise<string | null> {
        return this.data.get(key)
    }
    protected async setValueImpl(key: string, val: string): Promise<void> {
        this.data.set(key, val)
    }
}

export function createStringStorage<TKeyVal, TStorage extends BaseStringStorage<TKeyVal>>(
    ctor1: new () => TKeyVal,
    ctor2: new (ctor: new () => TKeyVal) => TStorage): TStorage {
    return new ctor2(ctor1)
}
