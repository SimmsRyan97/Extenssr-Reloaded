
import { ILogger, AbyssTag } from 'logging/logging'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'

@injectable()
export default class AbyssLogger implements ILogger {
    tag: AbyssTag = AbyssTag.NONE
    broker: ContentAndBackgroundMessageBroker
    constructor(
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker
    ) {
        this.broker = broker
    }
    withTag(tag: AbyssTag): ILogger {
        const newLogger = this.clone()
        newLogger.tag = tag
        return newLogger
    }
    clone(): AbyssLogger {
        return new AbyssLogger(this.broker)
    }
    log(message: string): void {
        if (this.tag == AbyssTag.NONE) {
            throw 'set a tag before sending this!'
        }
        this.broker.sendMessage('abyssMessage', {
            message: message,
            source: this.tag,
            timestamp: Date.now()
        })
    }
}
