import 'reflect-metadata'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'

import { aliasConfig } from './aliasing'

export default function eventHijackInject(broker: ChromeInjectedToContentBroker): void {
    let freezeAllListeners = false
    broker.createListener('freezeShortcuts', '', () => {
        freezeAllListeners = true
    })
    
    aliasConfig(window, {
        addEventListener: (oldAddEventListener) => (function(...args) {
            if (!freezeAllListeners || (args[0] !== 'keyup' && args[0] !== 'keydown'))
            return oldAddEventListener.apply(window, args)
        })
    })
    
    aliasConfig(document, {
        addEventListener: (oldAddEventListener) => (function(...args) {
            if (!freezeAllListeners || (args[0] !== 'keyup' && args[0] !== 'keydown'))
            return oldAddEventListener.apply(document, args)
        })
    })
}
