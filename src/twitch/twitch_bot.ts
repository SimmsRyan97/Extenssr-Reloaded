import Bot, { BotConnectionListener, BotPrivateMessageListener, BotPublicMessageListener, ConnectionStep } from 'twitch/bot'
import PubSub from 'twitch/pusbsub'
import IRC from 'twitch/irc'
import { AbyssTag, ILogger } from 'logging/logging'

const AUTH_BASE_URL = 'https://id.twitch.tv/oauth2/authorize'
declare let __CLIENT_ID__: string


const authFunc = (forceVerify: boolean, onSuccess: (token:string) => void, onFail?: () => void): void => {
    const url = AUTH_BASE_URL + '?' +
            `client_id=${__CLIENT_ID__}&` +
            `redirect_uri=${encodeURI(chrome.identity.getRedirectURL())}&` +
            'response_type=token&' +
            `force_verify=${forceVerify}&` +
            `scope=${encodeURI('chat:edit chat:read whispers:read whispers:edit')}`
    chrome.identity.launchWebAuthFlow({ url: url, interactive: true }, (response) => {
        if (!response) {
            if (onFail) {
                onFail()
            }
            return
        }
        const vars: { [id: string]: string } = Object.assign({}, ...response.split('#')[1].split('&').map(s => {
            const ret = {}
            const qVal = s.split('=').map(x => decodeURIComponent(x))
            ret[qVal[0]] = qVal[1]
            return ret
        }))
        onSuccess(vars['access_token'])
    })
}

export {authFunc}

export default class TwitchBot extends Bot {
    username = ''
    userId = ''
    token: string
    whispers?: PubSub
    channelMessages?: IRC
    forceVerify = false
    readonly logger: ILogger
    connectionListener?: BotConnectionListener = null
    constructor(token: string, logger: ILogger) {
        super()
        this.token = token
        this.logger = logger.withTag(AbyssTag.TWITCH_BOT)
    }
    setConnectionListener(listener: BotConnectionListener): void {
        this.connectionListener = listener
        this.whispers?.setConnectionListener(listener)
        this.channelMessages?.setConnectionListener(listener)
    }
    // This is a stupid hack, due to the auth flow from chrome.identity not remembering the username
    async fetchUsername(): Promise<void> {
        const headers = new Headers({
            'Authorization': `Bearer ${this.token}`,
            'client-id': __CLIENT_ID__
        })
        try {
            const usersData = await (await fetch('https://api.twitch.tv/helix/users', { headers: headers })).json()
            const userInfo = usersData.data[0]
            this.username = userInfo.display_name
            this.userId = userInfo.id
            this.connectionListener?.connectionSuccess(ConnectionStep.USERNAME_FETCH)
            this.whispers = new PubSub(this.token, this.userId, this.logger)
            this.channelMessages = new IRC(this.token, this.username, this.logger)
            this.whispers.connect(this.connectionListener)
        } catch (err) {
            this.connectionListener?.connectionFail(ConnectionStep.USERNAME_FETCH, `Failed to get user info! ${err}`)
        }
    }

    connect(connectionListener?: BotConnectionListener): void {
        this.connectionListener = connectionListener
        if (this.whispers) {
            return
        }
        this.fetchUsername()
    }

    disconnect(): void {
        this.whispers?.disconnect(true)
        this.channelMessages.disconnect()
        const url: string = 'https://id.twitch.tv/oauth2/revoke?' +
            `client_id=${__CLIENT_ID__}&` +
            `token=${this.token}`
        fetch(url, { method: 'POST' })
    }
    sendPublicMessage(message: string): void {
        this.channelMessages.sendMessage(message)
    }
    setPrivateMessageListener(listener: BotPrivateMessageListener): void {
        this.whispers.setListener(listener)
    }
    setPublicMessageListener(listener: BotPublicMessageListener): void {
        this.channelMessages.setMessageListener(listener)
    }
    joinChannel(channel: string): void {
        if (this.channelMessages.channel == channel) {
            return
        }
        this.channelMessages.connect(channel, this.connectionListener)
    }
    name(): string {
        return this.username
    }
    channel(): string {
        return this.channelMessages?.channel ?? ''
    }
}
