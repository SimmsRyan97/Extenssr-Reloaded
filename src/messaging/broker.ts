/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars */
import browser from 'webextension-polyfill'

type MaybePromise<T> = T | Promise<T>

// Mark arrays created by `Message<>` to differ them from non-`Message` arrays.
declare const messageBrand: unique symbol

/** Description for a message type. Response may be void to indicate no response. */
export type Message<Request, Response = void> = [Request, Response] & { [messageBrand]: '' }
/** Type-only description of all available messages. */
export interface IMessages {
    [name: string]: Message<unknown, unknown>
}
/** Extract the request data shape for a message type. */
export type RequestData<TMessage> = TMessage extends Message<infer R, any> ? R : never
/** Extract the response data shape for a message type. */
export type ResponseData<TMessage> = TMessage extends Message<any, infer R> ? R : never

export interface IMessageListener<TMessage extends Message<unknown, unknown>> {
    onMessage(msg: RequestData<TMessage>): MaybePromise<ResponseData<TMessage>>
    deregister(): void
    messageListenerName(): string
}

export type GenericMessage = {
    [key: string]: any
}

export interface IMessageBroker<TMessage extends IMessages> {
    sendMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>>
    sendInternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>>
    sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>>
    deregisterAll(): void
    addStorageListener(cb: (vals: any) => void): void
    createListener<TKey extends keyof TMessage>(key: TKey, listenerName: string, cb: (res: RequestData<TMessage[TKey]>) => MaybePromise<ResponseData<TMessage[TKey]>>): IMessageListener<TMessage[TKey]>
}

export interface EventLogger {
    logEvent(msg: GenericMessage, timestamp: number): void
    clearLogs(): void
}

export abstract class MessageBroker<TMessage extends IMessages> implements IMessageBroker<TMessage> {
    #listeners: Map<string, IMessageListener<any>[]> = new Map()
    #storageListeners: Array<(vals: any) => void> = []
    #eventLogger: EventLogger | null = null

    addStorageListener(cb: (vals: any)=>void): void {
        this.#storageListeners.push(cb)
    }
    hasListeners(key: string): boolean {
        return this.#listeners.has(key)
    }
    abstract sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>>
    setEventLogger(eventLogger: EventLogger): void {
        this.#eventLogger = eventLogger
    }
    protected async onOutwardsMessage(msg: GenericMessage, _sender: browser.Runtime.MessageSender): Promise<any> {
        // This is a little type-unsafe :innocent:
        let response: any
        if (msg.key === 'setValue') {
            for (const listener of this.#storageListeners) {
                listener(msg.val)
            }
        } else {
            response = await this.notifyListeners(msg.key, msg.val)
        }
        this.logEvent(msg, Date.now())
        return response
    }
    #anonimize(msg: GenericMessage): GenericMessage {
        if (!msg) {
            return msg
        }
        if (typeof msg == 'object') {
            const arr = msg as GenericMessage[]
            if (arr && arr.length) {
                return arr.map(p => this.#anonimize(p))
            }
            const ret = {}
            Object.keys(msg)?.forEach(key => {
                if (['lat', 'lng', 'countryCode'].includes(key)) {
                    ret[key] = 'CENSORED'
                } else {
                    ret[key] = this.#anonimize(msg[key])
                }
            })
            return ret
        }
        return msg
    }
    #logEventInternal(msg: GenericMessage, timestamp: number): void {
        if (msg == undefined || msg == null) {
            return
        }
        const anonimized = this.#anonimize(msg)
        this.#eventLogger?.logEvent(anonimized, timestamp)
    }
    protected logEvent(msg: GenericMessage, timestamp: number): void {
        this.#logEventInternal({...msg}, timestamp)
    }
    sendInternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        return this.notifyListeners(key, msg)
    }
    async sendMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const toPrint = Object.assign({})
        toPrint[key] = msg
        this.logEvent(toPrint, Date.now())
        delete toPrint[key]
        const internalResponse =  await this.sendInternalMessage(key, msg)
        if (internalResponse) {
            toPrint[(key as string) + '_internalresponse'] = internalResponse
            this.logEvent(toPrint, Date.now())
            return internalResponse
        }
        const externalResponse = await this.sendExternalMessage(key, msg)
        if (externalResponse) {
            toPrint[(key as string) + '_externalresponse'] = externalResponse
            this.logEvent(toPrint, Date.now())
        }
        return externalResponse
    }
    async notifyListeners<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const listeners: IMessageListener<TMessage[TKey]>[] = (this.#listeners.get(key as string) ?? [])
        const returnValues = await Promise.all(listeners.map((listener) => listener.onMessage(msg)))
        const responses = returnValues.filter((value) => value !== undefined)
        if (responses.length > 1) {
            throw new Error('got a response from multiple handlers, not sure which to pick')
        }
        // What should we do if there are 0 responses?
        // Perhaps we should only return a response if there is exactly one listener?
        return responses[0]
    }
    #registerListener<TKey extends keyof TMessage>(key: TKey, listener: IMessageListener<TMessage[TKey]>): void {
        const listeners: IMessageListener<any>[] = (this.#listeners.get(key as string) ?? [])
        listeners.push(listener)
        this.#listeners.set(key as string, listeners)
    }
    #deregisterListener<TKey extends keyof TMessage>(key: TKey, listener: IMessageListener<TMessage[TKey]>): void {
        const listeners: IMessageListener<any>[] = (this.#listeners.get(key as string) ?? []).filter(x => x !== listener)
        this.#listeners.set(key as string, listeners)
    }
    deregisterAll(): void {
        this.#listeners.clear()
    }
    createListener<TKey extends keyof TMessage>(key: TKey, listenerName: string, cb: (res: RequestData<TMessage[TKey]>) => MaybePromise<ResponseData<TMessage[TKey]>>): IMessageListener<TMessage[TKey]> {
        const listener: IMessageListener<TMessage[TKey]> = {
            // I don't honestly remember why this is here. I imagine for logging, but... eh.
            messageListenerName: (): string => listenerName,
            onMessage: cb,
            deregister: () => { this.#deregisterListener(key, listener)}
        }
        this.#registerListener(key, listener)
        return listener
    }
}

export class InternalOnlyMessageBroker<TMessage extends IMessages> extends MessageBroker<TMessage> {
    async sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        // no-op
        return null
    }
}