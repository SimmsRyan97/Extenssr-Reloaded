import { SavedLocation } from 'location_saving/location'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { MapListener } from './maps'

export class SavedLocationViewer implements MapListener {
    mapView: google.maps.Map = null
    features: google.maps.Data.Feature[] = []
    service: google.maps.StreetViewService = null
    broker: ChromeInjectedToContentBroker
    savedLocationsSelectedListenr = null
    clearSavedLocationsListener = null

    constructor(broker: ChromeInjectedToContentBroker) {
        this.broker = broker
    }

    onMapUpdated(mmap: google.maps.Map): void {
        if (!this.service) {
            this.service = new google.maps.StreetViewService()
        }
        if (!mmap) {
            return
        }
        this.mapView = mmap
        this.mapView.data.addListener('click', (evt: google.maps.Data.MouseEvent) => {
            if (evt.feature === null) {
                return
            }
            const feature = evt.feature
            if (!feature.getProperty('isSavedLocation')) {
                // use geoguessr's default behaviour for any marker that's not ours
                return
            }

            const streetView = this.mapView.getStreetView()
            streetView.setVisible(true)
            streetView.setPano(feature.getProperty('panoId') as string)
            streetView.setPosition(feature.getProperty('pos') as google.maps.LatLng)
            streetView.setPov({heading: feature.getProperty('heading') as number, pitch: feature.getProperty('pitch') as number})
        })
        this.savedLocationsSelectedListenr?.deregister()
        this.savedLocationsSelectedListenr = this.broker.createListener('savedLocationsSelected', '', (savedLocations) => {
            this.savedLocationsSelected(savedLocations)
        })
        this.clearSavedLocationsListener?.deregister()
        this.clearSavedLocationsListener = this.broker.createListener('clearSavedLocations', '', () => {
            this.clearSavedLocations()
        })
    }

    savedLocationsSelected(savedLocations: SavedLocation[]): void {
        this.mapView.controls[google.maps.ControlPosition.LEFT_CENTER].clear()
        this.mapView.controls[google.maps.ControlPosition.LEFT_TOP].clear()
        this.clearSavedLocations()
        savedLocations.forEach(savedLocation => {
            const latLng = new google.maps.LatLng(savedLocation.pos.lat, savedLocation.pos.lng)
                const feature = new google.maps.Data.Feature({
                    geometry: latLng,
                    properties: {
                        pos: latLng,
                        pov: {
                            heading: savedLocation.heading,
                            pitch: savedLocation.pitch,
                        },
                        isSavedLocation: true,
                    },
                })
                this.features.push(feature)
                this.mapView.data.add(feature)
                this.service.getPanorama({location:{lat: savedLocation.pos.lat, lng: savedLocation.pos.lng}, radius: 50}, (data, status) => {
                    if (status === google.maps.StreetViewStatus.OK) {
                        feature.setProperty('panoId', data.location.pano)
                    }
                })
        })
    }

    clearSavedLocations(): void {
        this.features.forEach(feature => this.mapView.data.remove(feature))
        this.features = []
        this.mapView.getStreetView().setVisible(false)
    }
}
