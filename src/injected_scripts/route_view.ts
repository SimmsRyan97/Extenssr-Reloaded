import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'

import { Route } from 'route_saving/route'
import { MapListener } from './maps'

export class RouteView implements MapListener {
    #mapView: google.maps.Map | null = null
    #route: Route | null = null
    #lines: google.maps.Polyline[] = []
    #broker: ChromeInjectedToContentBroker
    #clearRoutesListener = null
    #showRoutesListener = null

    constructor(broker: ChromeInjectedToContentBroker) {
        this.#broker = broker
    }

    onMapUpdated(mmap: google.maps.Map): void {
        this.#mapView = mmap
        this.#clearRoutesListener?.deregister()
        this.#clearRoutesListener = this.#broker.createListener('clearRoutes', '', () => {
            this.clearLines()
        })
        this.#showRoutesListener?.deregister()
        this.#showRoutesListener = this.#broker.createListener('showRoutes', '', (route) => {
            this.clearLines()
            this.#route = route
            this.#drawLines()
        })
        this.#drawLines()
    }

    #drawLines(): void {
        if (!this.#mapView || !this.#route) {
            return
        }

        for (const path of this.#route) {
            this.#lines.push(new google.maps.Polyline({
                path,
                geodesic: false, // probably not necessary since the steps are small
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: this.#mapView,
            }))
        }
    }

    clearLines(): void {
        for (const line of this.#lines) {
            line.setMap(null)
        }
        this.#lines = []
    }
}
