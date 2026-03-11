import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { GoogleOverrider } from './maps_api_injecter'
import { RegionSelector } from './region_selector'
import { RouteView } from './route_view'
import { SavedLocationViewer } from './saved_location_viewer'


export interface MapListener {
    onMapUpdated(mmap: google.maps.Map): void
}

export class MapNotifier {
    listeners: MapListener[] = []
    addListener(listener: MapListener): void {
        this.listeners.push(listener)
    }
    notify(mmap: google.maps.Map): void {
        this.listeners.forEach(listener => listener.onMapUpdated(mmap))
    }
}

export function addMapListeners(broker: ChromeInjectedToContentBroker, map_notifier: MapNotifier) {
    map_notifier.addListener(new RouteView(broker))
    map_notifier.addListener(new SavedLocationViewer(broker))
    map_notifier.addListener(new RegionSelector(broker))

}

export default function mapsOverrider(map_notifier: MapNotifier): GoogleOverrider {
    let globalMap: google.maps.Map | null = null
    return (g: typeof google) => {
        if (globalMap) {
            return
        }
        g.maps.Map = class MapHook extends google.maps.Map {
            constructor(mapDiv: HTMLElement, opts?: google.maps.MapOptions) {
                super(mapDiv, opts)

                const listener = this.addListener('idle', () => {
                    if (globalMap !== null) {
                        return
                    }
                    globalMap = this
                    listener.remove()
                    map_notifier.notify(this)
                })
            }
        }
    }
}


