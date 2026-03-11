import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { StreetviewListener } from './street_view'


export class MovementHelper implements StreetviewListener {
    broker: ChromeInjectedToContentBroker
    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }
    onStreetviewUpdated(streetView: google.maps.StreetViewPanorama): void {
        if (!streetView) {
            return
        }
        let old_pov = streetView.getPov()
        let af = null
        const updateFunc = () => {
            const new_pov = streetView.getPov()
            let vx = new_pov.heading - old_pov.heading
            if (Math.abs(vx) > 100.0) {
                if (vx < 0) {
                    vx += 360.0
                } else {
                    vx -= 360.0
                }
            }
            const vy = new_pov.pitch - old_pov.pitch
            this.broker.sendInternalMessage('changePov', [vx, vy])
            old_pov = new_pov
            if (af == null && (Math.abs(vx) > 1e-4 || Math.abs(vy) > 1e-4)) {
                af = requestAnimationFrame(() => {
                    updateFunc()
                    af = null
                })
            }
        }
        streetView.addListener('pov_changed', updateFunc)
    }
}