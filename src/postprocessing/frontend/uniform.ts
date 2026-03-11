import { CachedValueStoreClient } from 'storage/value_store'

export enum UniformType {
    FLOAT,
    VEC2,
    VEC3,
    TEX,
    INT,
    INTVEC
}

export type Uniform = {
    name: string
    type: UniformType
    vecSize?: number
    value?: number[]
}

export interface UpdatableUniform {
    uniform: Uniform
    updateUniform(uniform: Uniform): void
}

export type UniformUpdateFunc = (_: Uniform) => void

export class StorageUpdatableUniform implements UpdatableUniform {
    uniform: Uniform
    paused = false
    pausedUniform: Uniform | null = null
    func: UniformUpdateFunc
    private constructor(name: string, type: UniformType, func: UniformUpdateFunc, value: number[] | null = null) {
        this.uniform = {name, type, value}
        this.func = func
    }
    pause(paused: boolean): void {
        const oldPaused = this.paused
        this.paused = paused
        if (this.paused && !oldPaused && this.pausedUniform !== null) {
            this.uniform = this.pausedUniform
        }
        if (!this.paused) {
            this.pausedUniform = null
        }
    }
    updateUniform(uniform: Uniform): void {
        if (this.paused) {
            this.pausedUniform = this.uniform
        } 
        this.uniform = uniform
        this.func(this.uniform)
    }
    #updateFromStorage(uniform: Uniform): void {
        if (this.paused) {
            this.pausedUniform = uniform
        } else {
            this.uniform = uniform
            this.func(this.uniform)
        }
    }
    static fromKey<TKeyVal, TKey extends keyof TKeyVal>(storage: CachedValueStoreClient<TKeyVal>, name: string, key: TKey, updateFunc: UniformUpdateFunc): StorageUpdatableUniform {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = [storage.getCachedValue(key) as any as number]
        const updatableUniform = new StorageUpdatableUniform(name, UniformType.FLOAT, updateFunc, value)
        storage.createListener(key, (newVal) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = [newVal as any as number]
            const uniform: Uniform = {name, type: UniformType.FLOAT, value: val} 
            updatableUniform.#updateFromStorage(uniform)
        })
        return updatableUniform
    }
}