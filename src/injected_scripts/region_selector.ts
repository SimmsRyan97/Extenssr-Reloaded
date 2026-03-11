import { Polygon } from 'geocoding/geojson/gejson'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import { MapListener } from './maps'


enum FeatureType {
    COUNTRY_SELECT,
    GOOD_GUESS,
    BAD_GUESS
}

export class RegionSelector implements MapListener {
    #map: google.maps.Map | null = null
    #selectable = false
    #selectedCountry: google.maps.Data.Feature | null = null
    #goodGuess: google.maps.Data.Feature | null = null
    #badGuess: google.maps.Data.Feature | null = null
    #broker: ChromeInjectedToContentBroker
    #countrySelectListener = null
    #clearStreaksBoundaryListener = null
    #streaksBoundaryListener = null
    #streaksGoodResultListener = null
    #streaksBadResultListener = null

    constructor(broker: ChromeInjectedToContentBroker) {
        this.#broker = broker
    }
    onMapUpdated(mmap: google.maps.Map): void {
        this.#map = mmap
        this.#map.addListener('click', (evt: google.maps.Data.MouseEvent) => {
            if (this.#selectable) {
                this.#broker.sendExternalMessage('streaksClick', {lat: evt.latLng.lat(), lng: evt.latLng.lng()})
            }
        })
        this.#countrySelectListener?.deregister()
        this.#countrySelectListener = this.#broker.createListener('countrySelect', '', (enabled) => {
            this.#selectable = enabled
            this.removeFeatures()
        })
        this.#clearStreaksBoundaryListener?.deregister()
        this.#clearStreaksBoundaryListener = this.#broker.createListener('clearStreaksBoundary', '', () => {
            this.removeFeatures()
        })
        this.#streaksBoundaryListener?.deregister()
        this.#streaksBoundaryListener = this.#broker.createListener('streaksBoundary', '', (boundary) => {
            this.removeFeatures()
            this.#selectedCountry = this.#createFeature(boundary, FeatureType.COUNTRY_SELECT)   
        })
        this.#streaksGoodResultListener?.deregister()
        this.#streaksGoodResultListener = this.#broker.createListener('streaksGoodResult', '', ({boundary}) => {
            this.removeFeatures()
            this.#goodGuess = this.#createFeature(boundary, FeatureType.GOOD_GUESS)
        })
        this.#streaksBadResultListener?.deregister()
        this.#streaksBadResultListener = this.#broker.createListener('streaksBadResult', '', ({boundary, expectedBoundary}) => {
            this.removeFeatures()
            this.#goodGuess = this.#createFeature(expectedBoundary, FeatureType.GOOD_GUESS)
            this.#badGuess = this.#createFeature(boundary, FeatureType.BAD_GUESS)
        })
        this.#broker.sendExternalMessage('regionSelectorLoaded', null)
    }

    #createFeature(boundary: Polygon[][], featureType: FeatureType): google.maps.Data.Feature {
        const feature = this.#map.data.add({
            geometry: new google.maps.Data.MultiPolygon(
                // MultiPolygon => array of Polygon
                // Polygon => [boundary + cavities] => array of Coord[]
                boundary.map(segment => segment.map(poly => poly.map(([y, x]) =>  {
                    return {lat: x, lng: y}
                }))))
        })
        this.#map.data.overrideStyle(feature, this.#styleForFeature(featureType))
        return feature
    }
    removeFeatures(): void {
        if (this.#selectedCountry) {
            this.#map.data.remove(this.#selectedCountry)
            this.#selectedCountry = null
        }
        if (this.#goodGuess) {
            this.#map.data.remove(this.#goodGuess)
            this.#goodGuess = null
        }
        if (this.#badGuess) {
            this.#map.data.remove(this.#badGuess)
            this.#badGuess = null
        }
    }
    #styleForFeature(featureType: FeatureType): google.maps.Data.StyleOptions {
        const styleOptions: google.maps.Data.StyleOptions = {}
        styleOptions.clickable = false
        styleOptions.fillOpacity = 0.4
        switch (featureType) {
            case FeatureType.COUNTRY_SELECT: {
                styleOptions.fillColor = '#3131b0'
                styleOptions.strokeColor = '#0e0e0f'
                break
            }
            case FeatureType.GOOD_GUESS: {
                styleOptions.fillColor = '#197827'
                styleOptions.strokeColor = '#0f2b13'
                break
            }
            case FeatureType.BAD_GUESS: {
                styleOptions.fillColor = '#ed6666'
                styleOptions.strokeColor = '#8c0707'
                break
            }
        }
        return styleOptions
    }
}
