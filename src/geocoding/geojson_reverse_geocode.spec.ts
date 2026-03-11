import * as fs from 'fs'
import { alpha3ToAlpha2, getName } from 'i18n-iso-countries'
import * as path from 'path'
import { FeatureProperties, GeoJson, GeoJsonProvider } from './geojson/gejson'

import GeoJsonReverseGeoCode, { FeaturePropertyParser } from './geojson_reverse_geocode'

class DefaultProvider implements GeoJsonProvider {
    async getGeoJson(): Promise<GeoJson> {
        const countries = fs.readFileSync(path.join(__dirname, '../../geojson_data', 'countries.geojson')).toString('utf-8')
        return JSON.parse(countries)
    }
}

class DefaultPropertyParser implements FeaturePropertyParser {
    getCodeAndName(properties: FeatureProperties): [string, string] {
        const threeCode = properties['ISO_A3']
        const code = alpha3ToAlpha2(threeCode)
        const name = getName(code, 'en')
        return [code, name]
    }

}

const geoJson = new GeoJsonReverseGeoCode(new DefaultProvider(), new DefaultPropertyParser())

describe('GeoJson default countries tests', () => {
        it('London location', async () => {
            const [code, name] = await geoJson.getCodeAndName(51.430748, -0.255427)
            expect(code).toBe('GB')
            expect(name).toBe('United Kingdom')
        })
        it('Near Paris', async () => {
            const [code, name] = await geoJson.getCodeAndName(49.106214,  2.780476)
            expect(code).toBe('FR')
            expect(name).toBe('France')
        })
        it('Near Frankfurt', async () => {
            const [code, name] = await geoJson.getCodeAndName(50.267989, 8.472575)
            expect(code).toBe('DE')
            expect(name).toBe('Germany')
        })
})
    