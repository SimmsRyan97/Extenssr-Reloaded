import { BotPrivateMessageListener, BotConnectionListener, ConnectionStep } from 'twitch/bot'
import { ILogger, AbyssTag } from 'logging/logging'
const BASE_URL = 'wss://pubsub-edge.twitch.tv'


enum WSMessageType {
    PING = 'PING',
    PONG = 'PONG',
    RESPONSE = 'RESPONSE',
    RECONNECT = 'RECONNECT',
    LISTEN = 'LISTEN',
    MESSAGE = 'MESSAGE'

}
class WSMessage {
    type?: WSMessageType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
    error?: string
    nonce?: string
}

const PONG_MSG: WSMessage = {
    type: WSMessageType.PONG
}

const PONG_MSG_TXT: string = JSON.stringify(PONG_MSG)

export default class PubSub {
    #ws: WebSocket
    #token: string
    #userId: string
    #messageListener?: BotPrivateMessageListener
    #connectionListener?: BotConnectionListener
    readonly logger: ILogger
    constructor(token: string, userId: string, logger: ILogger) {
        this.#token = token
        this.#userId = userId
        this.logger = logger.withTag(AbyssTag.PUB_SUB)
    }
    onMessage(message: WSMessage): void {
        if (message.type == WSMessageType.PING) {
            this.#ws.send(PONG_MSG_TXT)
        } else if (message.type == WSMessageType.RECONNECT) {
            this.reconnect()
        } else if (message.type == WSMessageType.MESSAGE) {
            const inner_message = JSON.parse(message.data.message)
            const inner_message_type = inner_message.type
            const inner_data = JSON.parse(inner_message['data'])
            const body = inner_data.body
            const tags = inner_data.tags
            const from_username = tags.login
            const from_displayname = tags.display_name
            if (inner_message_type == 'whisper_received') {
                this.#messageListener?.onPrivateMessage(body, from_username, from_displayname)
            }
        } else if (message.type == WSMessageType.RESPONSE) {
            this.logger.log(message.error)
            if (message.error) {
                this.disconnect(true)
            }
        }
    }
    async reconnect(): Promise<void> {
        this.disconnect(false)
        this.connect()
    }
    setConnectionListener(connectionListener: BotConnectionListener): void {
        this.#connectionListener = connectionListener
    }
    async connect(connectionListener?: BotConnectionListener): Promise<void> {
        this.#connectionListener = connectionListener
        this.#ws = new WebSocket(BASE_URL)
        this.#ws.addEventListener('message', (event: MessageEvent<any>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            this.onMessage(Object.assign(new WSMessage(), JSON.parse(event.data)))
        })
        this.#ws.addEventListener('open', () => {
            const whisperTopic: WSMessage = {
                type: WSMessageType.LISTEN,
                data: {
                    topics: [`whispers.${this.#userId}`],
                    auth_token: this.#token
                }
            }
            this.#ws.send(JSON.stringify(whisperTopic))
            this.#connectionListener?.connectionSuccess(ConnectionStep.PUBSUB)
        })
    }
    setListener(listener: BotPrivateMessageListener): void {
        this.#messageListener = listener
    }
    async disconnect(permanent: boolean): Promise<void> {
        if (this.#ws && this.#ws.readyState != WebSocket.CLOSED && this.#ws.readyState != WebSocket.CLOSING) {
            try {
                this.#ws.close()
            } catch(e) {
                this.logger.log(`Failed to close socket with state ${this.#ws.readyState}: ${e}`)
            }
        }
        if (permanent) {
            this.#connectionListener?.connectionFail(ConnectionStep.PUBSUB, 'Manual disconnect')
        }
    }
}