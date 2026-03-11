import browser from 'webextension-polyfill'
import { RequestData, ResponseData, GenericMessage, MessageBroker } from './broker'
import { ChromeStorage} from '../storage/chrome_storage'
import { Messages } from './messages'
import { SettingsKeys } from 'storage/storage'
import { injectable } from 'inversify'

// The intent with this TAB_FILTER was to only talk to GeoGuessr tabs
// and reduce our log spam. But it caused things to break, I think because
// messages were no longer passed between the background worker and the tabs?
//
// Ideally we could use a long-lived connection like this:
// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
// But that breaks when the browser decides to kill the background worker.
// May be a good idea to look at how other extensions approach that…
const TAB_FILTER = {}

const RECEIVING_END_DOES_NOT_EXIST = 'Could not establish connection. Receiving end does not exist.'

function isReceivingEndMissingError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('message' in error)) {
        return false
    }
    const message = String((error as { message?: unknown }).message)
    return message.includes(RECEIVING_END_DOES_NOT_EXIST)
}

@injectable()
export default abstract class ContentAndBackgroundMessageBroker extends MessageBroker<Messages> { }

// Broker for messages between content script(s) and background script.
export class ChromeMessageBroker extends ContentAndBackgroundMessageBroker {
    isBackground: boolean
    isPopup: boolean
    port: browser.Runtime.Port
    portId = 0
    ports: Map<number, browser.Runtime.Port> = new Map()
    constructor(isBackground = false, isPopup = false) {
        super()
        this.isBackground = isBackground
        this.isPopup = isPopup
        this.setupListeners()
    }

    protected setupListeners() {
        if (this.isPopup) {
            this.port = browser.runtime.connect()
            this.port.onMessage.addListener(async (msg, port) => {
                if (this.hasListeners(msg.key)) {
                    await this.onOutwardsMessage(msg, port.sender, port)
                }
            })
        } else {
            if (this.isBackground) {
                browser.runtime.onConnect.addListener((port) => {
                    const id = this.portId
                    this.ports.set(id, port)
                    this.portId += 1
                    port.onDisconnect.addListener(() => {
                        this.ports.delete(id)
                    })
                })
            }
            browser.runtime.onMessage.addListener(async (msg, sender) => {
                try {
                    const response = await this.onOutwardsMessage(msg, sender)
                    return response
                } catch (error) {
                    console.error(error)
                    throw error
                }
            })
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async onOutwardsMessage(msg: GenericMessage, sender: browser.Runtime.MessageSender, port?: browser.Runtime.Port): Promise<any> {
        if (this.isBackground) {
            const tabs = await browser.tabs.query(TAB_FILTER)
            const notifyTab = async (tab: browser.Tabs.Tab) => {
                // avoid broadcasting back to the tab that sent this message
                if (sender == undefined || sender.tab == undefined || sender.tab.id == undefined || tab.id == undefined || sender.tab.id !== tab.id) {
                    try {
                        await browser.tabs.sendMessage(tab.id, msg)
                    } catch (error) {
                        if (isReceivingEndMissingError(error)) {
                            return
                        }
                        console.error(error)
                    }
                }
            }
            const notifyPort = async (otherPort: browser.Runtime.Port) => {
                if (port === otherPort) {
                    return
                }
                otherPort.postMessage(msg)
            }
            await Promise.all(tabs.map(notifyTab).concat(Object.values(this.ports).map(notifyPort)))
        }
        return super.onOutwardsMessage(msg, sender)
    }

    async sendExternalMessage<TKey extends keyof Messages>(key: TKey, data: RequestData<Messages[TKey]>): Promise<ResponseData<Messages[TKey]>> {
        const msg = { key: key as string, val: data }
        if (this.isBackground) {
            const tabs = await browser.tabs.query(TAB_FILTER)
            for (const tab of tabs) {
                try {
                    await browser.tabs.sendMessage(tab.id, msg)
                } catch (error) {
                    if (isReceivingEndMissingError(error)) {
                        continue
                    }
                    console.error(error)
                }
            }
            this.ports.forEach((port) => {
                port.postMessage(msg)
            })
        } else if (this.isPopup) {
          // Do not wait for a response.
          this.port.postMessage(msg)
        } else {
            try {
                const response = await browser.runtime.sendMessage(msg)
                return response
            } catch (error) {
                if (isReceivingEndMissingError(error)) {
                    return undefined
                }
                throw error
            }
        }
    }
}

export async function createStorageAndBroker(isBackground = false, isPopup = false): Promise<[ChromeStorage, ContentAndBackgroundMessageBroker]> {
    const storage = await ChromeStorage.create()
    const broker = new ChromeMessageBroker(isBackground, isPopup)
    broker.addStorageListener((vals: Partial<SettingsKeys>) => {
        for (const key in vals) {
            storage.setValueFromBroker(key as keyof SettingsKeys, vals[key])
        }
    })
    storage.addBrokerListener((val) => broker.sendExternalMessage('setValue', val))
    return [storage, broker]
}
