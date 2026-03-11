import { GoogleOverrider } from './maps_api_injecter'
import { RouteSaver } from './route_saver'
import { LocationSaver } from './location_saver'
import { TextModeHelper } from './text_mode_helper'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { MovementHelper } from './movement_helper'

export interface StreetviewListener {
    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void
}

export class StreetviewNotifier {
    listeners: StreetviewListener[] = []
    addListener(listener: StreetviewListener): void{
        this.listeners.push(listener)
    }
    notify(streetView: google.maps.StreetViewPanorama): void {
        this.listeners.forEach(listener => listener.onStreetviewUpdated(streetView))
    }
}

class OffscreenContentRefresher implements  StreetviewListener {
    listener = null
    broker: ChromeInjectedToContentBroker
    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }
    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void {
        if (this.listener) {
            this.listener.deregister()
        }
        this.listener = this.broker.createListener('refreshOffscreenContent', '', () => {
            const pov = streetView.getPov()
            window.requestAnimationFrame(() => {
                streetView.setPov({
                    heading: pov.heading + 1.0,
                    pitch: pov.pitch + 1.0
                })
                window.requestAnimationFrame(() => {
                    streetView.setPov(pov)})
            })
        })
    }
    
}
export function addStreetviewListeners(broker: ChromeInjectedToContentBroker, notifier: StreetviewNotifier): void {
    notifier.addListener(new RouteSaver(broker))
    notifier.addListener(new LocationSaver(broker))
    notifier.addListener(new TextModeHelper(broker))
    notifier.addListener(new MovementHelper(broker))
    notifier.addListener(new OffscreenContentRefresher(broker))
}
export default function streetViewOverrider(notifier: StreetviewNotifier): GoogleOverrider {
    const oldUserAgent = window.navigator.userAgent
    // TODO: Maybe add a toggle to force this?
    if (!oldUserAgent.includes('Chrome') && !oldUserAgent.includes('Firefox') && !oldUserAgent.includes('Edge')) {
        Object.defineProperty(navigator, 'userAgent', {
            get: function () { return oldUserAgent + ' Chrome/93.0.4577.63'} // spoof a user agent that uses WebGL for Street View.
        })
    }
    let done = false
    
    return (g: typeof google) => {
        if (done) {
            return
        }
        g.maps.StreetViewPanorama = class StreetViewPanoramaHook extends google.maps.StreetViewPanorama {   
            constructor(container: HTMLElement, opts?: google.maps.StreetViewPanoramaOptions) {
                super(container, opts)
                notifier.notify(this)
            }
        }
        done = true
    }
}
