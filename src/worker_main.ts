/**
 * Entry point for worker script.
 */
import 'reflect-metadata'
import browser from 'webextension-polyfill'
import { createStorageAndBroker } from 'messaging/content_to_background_broker'
import { CoopHandler } from 'coop/coop_handler'
import AbyssLogger from 'logging/abyss_logger'
import migrate from './migrate'
import DBManager from 'databases/db_manager'


browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'update') {
        return
    }
    // May reject, in that case the error is logged, but we still continue.
    migrate()
})

createStorageAndBroker(true).then(([storage, broker]) => {
    const workerLogger = new AbyssLogger(broker)

    broker.createListener('abyssMessage', 'Abyss logger', async (message) => {
        const debuggable = await storage.getValue('debuggable')
        if (!debuggable) {
            return
        }
        const logs = await storage.getValue('logs')
        logs.push({
            timestamp: Date.now(),
            source: message.source,
            message: message.message
        })
        storage.setValue('logs', logs)
    })
    broker.createListener('reloadExtension', '', () => {
        chrome.runtime.reload()
    })
    new DBManager(broker, storage, workerLogger)
    new CoopHandler(storage, broker)
})
