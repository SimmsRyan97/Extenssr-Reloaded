import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { StreetviewListener } from './street_view'

export class TextModeHelper implements StreetviewListener {
    service: google.maps.StreetViewService = null
    broker: ChromeInjectedToContentBroker
    listener = null
    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }
    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void {
        if (!streetView) {
            return
        }
        this.service = new google.maps.StreetViewService()
        this.listener?.deregister()
        this.listener = this.broker.createListener('updatePov', '', ({heading, pitch, zoom}) => {
            streetView.setPov({heading, pitch})
            streetView.setZoom(zoom)
        })
    }
}