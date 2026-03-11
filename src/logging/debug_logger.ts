
import { ILogger, AbyssTag } from 'logging/logging'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'
import DebugHandler from 'debugging/debug_handler'
import { EventLogger, GenericMessage } from 'messaging/broker'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'

@injectable()
export default class DebugLogger implements ILogger, EventLogger {
    tag: AbyssTag = AbyssTag.NONE
    broker: ContentAndBackgroundMessageBroker
    injectedBroker: ChromeInjectedToContentBroker
    handler: DebugHandler
    constructor(
        @inject(config.DebugHandler) debugHandler: DebugHandler,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker | null,
        @inject(config.ChromeContentToInjectedBroker) injectedBroker: ChromeInjectedToContentBroker | null
    ) {
        this.handler = debugHandler
        if (broker) {
            debugHandler.setLogger(this)
        }
        broker?.setEventLogger(this)
        injectedBroker?.setEventLogger(this)
    }
    logEvent(message: GenericMessage, timestamp: number): void {
        this.handler.sendMessage({
            event: {
                message,
                timestamp
            }
        })
    }
    clearLogs(): void {
        // 
    }

    withTag(tag: AbyssTag): ILogger {
        const newLogger = this.clone()
        newLogger.tag = tag
        return newLogger
    }
    clone(): DebugLogger {
        return new DebugLogger(this.handler, null, null)
    }

    log(message: string): void {
        if (this.tag == AbyssTag.NONE) {
            throw 'set a tag before sending this!'
        }
        this.handler.sendMessage({
            log: {
                tag: this.tag as string,
                message
            }
        })
    }
}
