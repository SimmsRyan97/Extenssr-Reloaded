import 'reflect-metadata'
import { injectable } from 'inversify'
import { IMessages, MessageBroker, RequestData, ResponseData } from './broker'
import { WindowMessageV2 } from './window_message'

export class ContentToInjectedBroker<TMessage extends IMessages> extends MessageBroker<TMessage> {
    nextId = 0
    constructor() {
        super()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        document.addEventListener('brokerRequest', async (evt: any) => {
            if (evt.detail && evt.detail.key) {
                const {key, msg, id} = evt.detail
                const response = await this.notifyListeners(key, msg)
                window.postMessage({msg: response, id}, '*')
            }
        })
    }
    sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const id = this.nextId
        this.nextId += 1
        const toPrint = Object.assign({})
        toPrint[key] = msg
        this.logEvent(toPrint, Date.now())
        delete toPrint[key]
        return new Promise<ResponseData<TMessage[TKey]>>((resolve) => {
            const listener = (evt) => {
                if (evt.detail && evt.detail.id == id) {
                    toPrint[(key as string) + '_response'] = evt.detail
                    this.logEvent(toPrint, Date.now())
                    document.removeEventListener('brokerResponse', listener)
                    resolve(evt.detail.msg)
                }
            }
            document.addEventListener('brokerResponse', listener)
            window.postMessage({key, msg, id}, '*')
        })
    }

}

export class InjectedToContentBroker<TMessage extends IMessages> extends MessageBroker<TMessage> {
    nextId = 0
    constructor() {
        super()
        window.addEventListener('message', async (evt) => {
            if (evt.data && evt.data.key) {
                const {key, msg, id} = evt.data
                
                if (this.hasListeners(key)) {
                    const received = {}
                    received[(key as string) + '_received'] = msg
                    this.logEvent(received, Date.now())
                    const response = await this.notifyListeners(key, msg)
                    document.dispatchEvent(new CustomEvent('brokerResponse', {detail: {msg: response, id}}))
                }
            }
        })
    }
    sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const id = this.nextId
        this.nextId += 1
        return new Promise<ResponseData<TMessage[TKey]>>((resolve) => {
            const listener = (event) => {
                if (event.data && event.data.id === id) {
                    window.removeEventListener('message', listener)
                    resolve(event.data.msg)
                }
            }
            window.addEventListener('message', listener)
            document.dispatchEvent(new CustomEvent('brokerRequest', { detail: { key, msg, id } }))
        })
    }
}

@injectable()
export class ChromeInjectedToContentBroker extends InjectedToContentBroker<WindowMessageV2> {}

@injectable()
export class ChromeContentToInjectedBroker extends ContentToInjectedBroker<WindowMessageV2> {}