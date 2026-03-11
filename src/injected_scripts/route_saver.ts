import { LatLong } from 'api/game'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { StreetviewListener } from './street_view'

export class RouteSaver implements StreetviewListener {
    streetView: google.maps.StreetViewPanorama = null
    moveListener: google.maps.MapsEventListener = null
    restartListener = null
    button: HTMLButtonElement = null
    broker: ChromeInjectedToContentBroker
    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }

    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void {
        if (!streetView) {
            return
        }
        this.deinit()
        this.streetView = streetView
        this.moveListener = streetView.addListener('position_changed', () => {
            const pos = streetView.getPosition()
            const latLng: LatLong = {
                lat: pos.lat(),
                lng: pos.lng()
            }
            this.broker.sendExternalMessage('updatePosition', latLng)
            this.bindBackToHomeButton()
        })
    }

    bindBackToHomeButton(): void {
        if (this.button) {
            if (this.button.isConnected)
            return
            this.button = null
            this.restartListener = null
        }
        this.button = document.querySelector('button[data-qa="return-to-start"]')
        if (this.button) {
            this.restartListener = () => {
                this.broker.sendExternalMessage('goHome', null)
            }
            this.button.addEventListener('click', this.restartListener)
        } else {
            window.requestAnimationFrame(() => this.bindBackToHomeButton())
        }
    }

    deinit(): void {
        if (this.moveListener) {
            this.moveListener.remove()
        }
        if (this.restartListener) {
            this.button.removeEventListener('click', this.restartListener)
            this.restartListener = null
            this.button = null
        }
    }
}