import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { StreetviewListener } from './street_view'


export class LocationSaver implements StreetviewListener {
    streetView: google.maps.StreetViewPanorama = null
    broker: ChromeInjectedToContentBroker
    listener = null
    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }
    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void {
        if (!streetView) {
            return
        }
        this.listener?.deregister()
        this.streetView = streetView
        this.listener = this.broker.createListener('queryLocation', '', async () => {
            const pos = this.streetView.getPosition()
            const pov = this.streetView.getPov()
            return {
                pos: {lat: pos.lat(), lng: pos.lng()},
                heading: pov.heading ?? 0,
                pitch: pov.pitch ?? 0
            }
        })
    }
}