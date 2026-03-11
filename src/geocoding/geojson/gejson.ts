export type Point = [number, number]
export type Polygon = Point[]

export type FeatureProperties = {[key: string]: string}

export interface FeatureGeometry {
    type: 'Polygon' | 'MultiPolygon',
    coordinates: Polygon[] | Polygon[][]
}

export interface Feature {
    properties: FeatureProperties,
    geometry: FeatureGeometry
}

export interface GeoJson {
    features: Feature[]
}

export interface GeoJsonProvider {
    getGeoJson(): Promise<GeoJson>
}
