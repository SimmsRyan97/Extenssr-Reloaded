export enum ConnectionStep {
    AUTH_TOKEN = 'auth_token',
    USERNAME_FETCH = 'username_fetch',
    PUBSUB = 'pubsub',
    IRC = 'irc',
    CHANNEL = 'channel'
}
export interface BotConnectionListener {
    connectionSuccess(step:ConnectionStep): void
    connectionFail(step: ConnectionStep, err: string): void
}

export interface BotPublicMessageListener {
    onPublicMessage(message: string, sender: string, senderDisplayName?: string): void
}

export interface BotPrivateMessageListener {
    onPrivateMessage(message: string, sender: string, senderDisplayName?: string): void
}

export default abstract class Bot {
    abstract joinChannel(channel: string): void
    abstract name(): string
    abstract channel(): string
    abstract connect(connectionListener?:BotConnectionListener): void
    abstract disconnect(): void
    abstract setConnectionListener(listener: BotConnectionListener): void
    abstract setPrivateMessageListener(listener: BotPrivateMessageListener): void
    abstract setPublicMessageListener(listener: BotPublicMessageListener): void
    abstract sendPublicMessage(message: string): void
}
