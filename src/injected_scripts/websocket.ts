import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'

let localBroker: ChromeInjectedToContentBroker = null
class MyWebsocket extends WebSocket {
    constructor(url, protocol) {
        super(url, protocol)
        const oldSend = this.send
        this.send = (...args) => {
            oldSend.apply(this, args)
            if (typeof args[0] === "string") {
                const data = JSON.parse(args[0] as string)
                localBroker?.sendExternalMessage('wsData', data)
            }
        }
        this.addEventListener('message', (evt) => {
            if (evt.data && typeof evt.data === "string") {
                const data = JSON.parse(evt.data)
                localBroker?.sendExternalMessage('wsData', data)
            }
        })
    }
}

export default function websocketInject(broker: ChromeInjectedToContentBroker): void {
    localBroker = broker
    window.WebSocket = MyWebsocket
}
