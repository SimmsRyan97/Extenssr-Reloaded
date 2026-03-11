/**
 * Ad-hoc implementation of a subset of the IRC functionality required for receiving and sending
 * messages on Twitch channels.
 * 
 * The regular twitch-js library does not work on service workers, as it uses XMLHttpRequest 
 */

const URL = 'wss://irc-ws.chat.twitch.tv:443'

import { BotConnectionListener, BotPublicMessageListener, ConnectionStep } from 'twitch/bot'
import { AbyssTag, ILogger } from 'logging/logging'
const MAX_RECONNECT_TIMEOUT = 30000

const MSG_DELAY = 2000
export default class IRC {
    ws: WebSocket = null
    token: string
    userName: string
    channel = ''
    autoReconnect = true
    reconnectBackoff = 100
    timeout = null
    sendMessageDelay = 0
    
    publicMessageListener?: BotPublicMessageListener
    motdRead = false
    connectionListener?: BotConnectionListener
    readonly logger: ILogger

    constructor(token: string, userName: string, logger: ILogger) {
        this.token = token
        this.userName = userName
        this.logger = logger.withTag(AbyssTag.IRC)
    }

    #onMessage(message: string): void {
        this.logger.log(`IRC on message ${message}`)
        if (!this.motdRead) {
            this.motdRead = true
            this.reconnectBackoff = 100
            this.connectionListener?.connectionSuccess(ConnectionStep.IRC)
            return
        }

        if (message.startsWith('PING ')) {
            this.ws.send(message.replace('PING', 'PONG'))
            return
        }
        const firstColon = message.indexOf(':')
        if (firstColon == -1) {
            return
        }
        // This code is so hacky; we hate to see it
        const secondColon = message.indexOf(':', firstColon + 1)
        const actualMessage = secondColon == -1 ? '' : message.substr(secondColon + 1)
        const messageMetadata = secondColon == -1 ? message.substr(1) : message.substring(firstColon + 1, secondColon - 1)
        const metadataParts = messageMetadata.split(' ')
        const whoSentIt = metadataParts[0].split('!')[0]
        const whatKindOfMessage = metadataParts[1]
        const whereItWasSent = metadataParts[2].trim().substr(1)
        if (whatKindOfMessage == 'PRIVMSG' && whereItWasSent == this.channel) {
            this.publicMessageListener?.onPublicMessage(actualMessage, whoSentIt)
        } else if (whatKindOfMessage == 'JOIN') {
            if (whereItWasSent == this.channel) {
                this.connectionListener?.connectionSuccess(ConnectionStep.CHANNEL)
            } else {
                this.connectionListener?.connectionFail(ConnectionStep.CHANNEL, `Connected to ${whereItWasSent}`)
            }
        }
    }

    sendMessage(message: string): void {
        const fullCommand = `PRIVMSG #${this.channel} :${message}`
        const prevDelay = this.sendMessageDelay
        const cb = () => {
            if (this.ws && this.channel) {
                this.ws?.send(fullCommand)
            }
            this.sendMessageDelay -= MSG_DELAY
            this.sendMessageDelay = Math.max(this.sendMessageDelay, 0)
        }
        this.sendMessageDelay += MSG_DELAY
        setTimeout(cb, prevDelay)
    }

    setConnectionListener(connectionListener: BotConnectionListener): void {
        this.connectionListener = connectionListener
    }

    connect(channel: string, connectionListener: BotConnectionListener): void {
        this.connectionListener = connectionListener
        if (this.channel && this.ws) {
            this.ws.send(`PART #${this.channel}`)
        }
        this.channel = channel
        this.ws = new WebSocket(URL)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ws.addEventListener('message', (event: MessageEvent<any>) => {
            this.#onMessage(event.data)
        })
        this.ws.addEventListener('open', () => {
            this.ws.send(`PASS oauth:${this.token}`)
            this.ws.send(`NICK ${this.userName}`)
            this.ws.send(`JOIN #${channel}`)
        })
        this.ws.addEventListener('error', (ev) => {
            this.logger.log(`IRC WS error: ${JSON.stringify(ev)}`)
        })
        this.ws.addEventListener('close', () => {
            if (this.autoReconnect) {
               this.timeout = setTimeout(() => this.connect(this.channel, this.connectionListener), this.reconnectBackoff)
               this.reconnectBackoff = Math.min(this.reconnectBackoff * 1.5, MAX_RECONNECT_TIMEOUT)
            }
        })
    }

    setMessageListener(publicMessageListener: BotPublicMessageListener): void {
        this.publicMessageListener = publicMessageListener
    }

    disconnect(): void {
        if (this.timeout){
            clearTimeout(this.timeout)
            this.timeout = null
        }

        this.autoReconnect = false
        if (this.ws && this.ws.readyState != WebSocket.CLOSED && this.ws.readyState != WebSocket.CLOSING) {
            try {
                this.ws.close()
            } catch(e) {
                this.logger.log(`Failed to close socket with state ${this.ws.readyState}: ${e}`)
            }
            
        }
        this.connectionListener.connectionFail(ConnectionStep.IRC, 'Manual disconnect')
        this.ws = null
        this.motdRead = false
        this.publicMessageListener = null
    }
}