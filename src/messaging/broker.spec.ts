import { Message, MessageBroker } from './broker'

type TestMessages = {
    fooEnabled: Message<boolean>
    barStr: Message<string>
}

class TestBroker extends MessageBroker<TestMessages> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendExternalMessage(): Promise<any> {
        // do nothing
    }
}

describe('broker tests', () => {
    it('createListener test', async () => {
        const broker = new TestBroker()
        let called = false
        broker.createListener('fooEnabled', 'Foo', (res) => {
            expect(res).toBeTruthy()
            called = true
        })
        await broker.sendMessage('fooEnabled', true)
        expect(called).toBeTruthy()
    })
    it('listener deregister test', async () => {
        // We're assuming the broker is synchronous
        const broker = new TestBroker()
        let count = 0
        const listener = broker.createListener('fooEnabled', 'Foo', (res) => {
            ++count
            expect(res).toBeTruthy()
        })
        await broker.sendMessage('fooEnabled', true)
        listener.deregister()
        await broker.sendMessage('fooEnabled', false)
        expect(count).toBe(1)
    })
    it ('deregisterall test', async () => {
        const broker = new TestBroker()
        broker.createListener('fooEnabled', 'listener1', () => {
            expect(false).toBeTruthy()
        })
        broker.createListener('barStr', 'listener2', () => {
            expect(false).toBeTruthy()
        })
        broker.deregisterAll()
        await broker.sendMessage('fooEnabled', true)
        await broker.sendMessage('barStr', '')
    })
})
