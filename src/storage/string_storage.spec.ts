import { createStringStorage, StringStorage } from './string_storage'

class KeyVal {
    defaultTrue = true
    defaultFalse = false
    defaultOne = 1
    defaultFoo = 'foo'
    bar = 'bar'
}

class Storage extends StringStorage<KeyVal> { }

describe('Stringstorage tests', () => {
    it('setValue', async () => {
        const storage: StringStorage<KeyVal> = createStringStorage(KeyVal, Storage)
        await storage.setValue('defaultFalse', true)
        await storage.setValue('defaultTrue', false)
        await storage.setValue('defaultOne', -1)
        await storage.setValue('defaultFoo', 'bar')
        const defaultTrue = await storage.getValue('defaultTrue')
        expect(defaultTrue).toBeFalsy()
        const defaultFalse = await storage.getValue('defaultFalse')
        expect(defaultFalse).toBeTruthy()
        const defaultOne = await storage.getValue('defaultOne')
        expect(defaultOne).toBe(-1)
        const defaultFoo = await storage.getValue('defaultFoo')
        expect(defaultFoo).toBe('bar')
    })
    it('setValue announces callback', (done) => {
        const storage: StringStorage<KeyVal> = createStringStorage(KeyVal, Storage)
        storage.createListener('defaultTrue', (val: boolean): void => {
            expect(val).toBeFalsy()
            done()
        })
        storage.setValue('defaultTrue', false)
    })
})
