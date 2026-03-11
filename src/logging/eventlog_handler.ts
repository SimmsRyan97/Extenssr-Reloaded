import { EventLogger, GenericMessage } from 'messaging/broker'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeStorage } from 'storage/chrome_storage'

type EventLogMessage = {
    msg: GenericMessage,
    timestamp: number,
}

export class EventLogHandler implements EventLogger {
    storage: ChromeStorage
    broker: ContentAndBackgroundMessageBroker
    events: EventLogMessage[] = []

    static readonly MAX_LOG = 100

    constructor(storage: ChromeStorage, broker: ContentAndBackgroundMessageBroker) {
        this.storage = storage
        this.broker = broker
        this.events = []
        this.setLoggerIfNeeded(false)
        storage.createListener('debuggable', (debuggable) => {
            this.setLoggerIfNeeded(debuggable)
        })
        broker.setEventLogger(this)
    }
    setLoggerIfNeeded(debuggable: boolean): void {
        if (debuggable) {
            this.broker.setEventLogger(this)
        } else {
            this.clearLogs()
            this.broker.setEventLogger(null)
        }
    }
    clearLogs(): void {
        this.events = []
        this.storage.setValue('events', [])
    }
    logEvent(msg: GenericMessage, timestamp: number): void {
        if (msg.key && msg.key === 'abyssMessage') {
            return
        }
        this.events.push({msg: msg, timestamp: timestamp})
        this.storage.setValue('events', this.events)
    }
}
