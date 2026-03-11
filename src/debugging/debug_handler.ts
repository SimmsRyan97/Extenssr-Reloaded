import { inject, injectable } from 'inversify'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import config from 'inversify.config'
import { GenericMessage } from 'messaging/broker'
import { AbyssTag, ILogger } from 'logging/logging'

declare const DEBUGGING: boolean
declare const DEBUG_PORT: number

export type LogMessage = {
    tag: string,
    message: string
}
export type EventMessage = {
    message: GenericMessage,
    timestamp: number
}

export type WebsocketShaderMessage = {
    compile?: string
    result?: string
}

export type DebugMessage = {
    log?: LogMessage
    event?: EventMessage
    shader?: WebsocketShaderMessage
    emitDone?: string
    toggleShader?: boolean
}

@injectable()
export default class DebugHandler {
    ws: WebSocket
    queue = []
    forceStop = false
    broker: ContentAndBackgroundMessageBroker
    logger: ILogger | null
    constructor(
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
    ) {
        this.broker = broker
        if (DEBUGGING) {
            this.#startListening()
        }
    }
    setLogger(logger: ILogger): void {
        this.logger = logger.withTag(AbyssTag.DEBUG_HANDLER)
    }
    sendMessage(msg: DebugMessage): void {
        if (this.ws) {
            if (this.ws.readyState !== WebSocket.OPEN) {
                this.queue.push(JSON.stringify(msg))
            } else {
                this.ws.send(JSON.stringify(msg))
            }
        }
    }
    onMessage(msg: DebugMessage): void {
        this.logger.log(`${JSON.stringify(msg)}`)
        if (msg.emitDone === '') {
            this.broker.sendInternalMessage('emitDone', null)
        } else if (msg.shader) {
            if (msg.shader.compile) {
                const code = msg.shader.compile
                this.logger.log(code)
                this.broker.sendInternalMessage('compileShader', code).then(result => {
                    if (result.length > 0) {
                        this.logger.log(`Error: ${result}`)
                    } else {
                        this.logger.log('Shader successfully compiled!')
                    }
                })
            }
        } else if (msg.toggleShader !== null) {
            this.logger.log('Non null toggleShader')
            this.broker.sendInternalMessage('toggleShader', msg.toggleShader)
        }
    }
    #startListening(): void {
        if (this.forceStop) {
            return
        }
        try {
            this.ws = new WebSocket(`ws://localhost:${DEBUG_PORT}`)
            this.ws.onerror = () => {
                this.ws.close()
                this.ws = null
                setTimeout(() => this.#startListening(), 1000)
            }
            this.ws.onmessage = (ev: MessageEvent<string>) => {
                if (ev.data) {
                    const data = JSON.parse(ev.data) as DebugMessage
                    this.onMessage(data)
                }
            }
            this.ws.onopen = () => {
                this.queue.forEach(msg => this.ws.send(msg))
                this.queue = []
            }
        } catch (e) {
            this.ws?.close()
            this.ws = null
            setTimeout(() => this.#startListening(), 1000)
        }

    }
    stopListening(): void {
        this.forceStop = true
        if (this.ws) {
            this.ws.close()
        }
    }
}


