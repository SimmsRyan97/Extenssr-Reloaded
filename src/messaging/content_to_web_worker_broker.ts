import { IMessages, MessageBroker, RequestData, ResponseData } from './broker'

enum MessageDirection {
    Request, Response
}


export class ContentToWebWorkerBroker<TMessage extends IMessages> extends MessageBroker<TMessage> {
    worker: Worker
    nextId = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    awaitingPromises: Map<number, (_: any) => void> = new Map()
    constructor(worker: Worker) {
        super()
        this.worker = worker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.worker.addEventListener('message', async (evt: MessageEvent<{id: number, direction: MessageDirection, key: keyof TMessage, data: any}>) => {
            const {direction} = evt.data
            switch (direction) {
                case MessageDirection.Response: {
                    const {id} = evt.data
                    if (this.awaitingPromises.has(id)) {
                        const {data} = evt.data
                        const listener = await this.awaitingPromises.get(id)
                        this.awaitingPromises.delete(id)
                        listener(data)
                    }
                    break
                }
                case MessageDirection.Request: {
                    const {id} = evt.data
                    const {key, data} = evt.data
                    if (this.hasListeners(key as string)) {
                        const response = this.notifyListeners(key, data)
                        this.worker.postMessage({id, data: response, key, direction: MessageDirection.Response})
                    }
                    break
                }
            }
        })
    }

    sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const id = this.nextId
        this.nextId += 1
        return new Promise<ResponseData<TMessage[TKey]>>((resolve) => {
            this.awaitingPromises.set(id, (returnData) => {
                resolve(returnData as ResponseData<TMessage[TKey]>)
            })
            this.worker.postMessage({key, data: msg, id, direction: MessageDirection.Request})
        })
    }
}

export class WebWorkerToContentBroker<TMessage extends IMessages> extends MessageBroker<TMessage> {
    nextId = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    awaitingPromises: Map<number, (_: any) => void> = new Map()
    constructor() {
        super()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        self.addEventListener('message', async (evt: MessageEvent<{id: number, direction: MessageDirection, key: keyof TMessage, data: any}>) => {
            const {id, key, data, direction} = evt.data
            switch (direction) {
                case MessageDirection.Request: {
                    if (this.hasListeners(key as string)) {
                        const response = await this.notifyListeners(key, data)
                        self.postMessage({key, id, direction: MessageDirection.Response, data: response})
                    }
                    break
                }
                case MessageDirection.Response: {
                    if (this.awaitingPromises.has(id)) {
                        const listener = this.awaitingPromises.get(id)
                        this.awaitingPromises.delete(id)
                        listener(data)
                    }
                    break   
                }
            }
            if (this.awaitingPromises.has(id)) {
                const {data} = evt.data
                const listener = this.awaitingPromises.get(id)
                this.awaitingPromises.delete(id)
                listener(data)
            }
        })
    }
    sendExternalMessage<TKey extends keyof TMessage>(key: TKey, msg: RequestData<TMessage[TKey]>): Promise<ResponseData<TMessage[TKey]>> {
        const id = this.nextId
        this.nextId += 1
        return new Promise<ResponseData<TMessage[TKey]>>((resolve) => {
            this.awaitingPromises.set(id, (returnData) => {
                resolve(returnData as ResponseData<TMessage[TKey]>)
            })
            self.postMessage({key, data: msg, direction: MessageDirection.Request, id})
        })
    }
}