import RTree from 'rbush'
import { FeatureProperties, GeoJsonProvider, Polygon } from './geojson/gejson'
import GeometryManager from './geojson/geometry_manager'
import FeatureManager, { Subdivision } from './geojson/feature_manager'
import { LatLong } from 'api/game'

export interface TagModifier {
    modifyTag(from: string): string
}

export interface FeaturePropertyParser {
    getCodeAndName(properties: FeatureProperties): [string, string]
}

export default class GeoJsonReverseGeoCode {
    tree: RTree<Subdivision> = null
    provider: GeoJsonProvider
    geometryManager: GeometryManager
    featureManager: FeatureManager

    constructor(provider: GeoJsonProvider, propertyParser: FeaturePropertyParser) {
        this.provider = provider
        this.geometryManager = new GeometryManager()
        this.featureManager = new FeatureManager(this.geometryManager, propertyParser)
    }

    async #initialize(): Promise<void> {
        this.tree = new RTree<Subdivision>()
        const geoJson = await this.provider.getGeoJson()
        const subdivisions: Subdivision[] = []
        for (const feature of geoJson.features) {
            subdivisions.push(...this.featureManager.addFeature(feature))
        }
        this.tree.load(subdivisions)
    }

    async getCodeAndName(lat: number, lng: number): Promise<[string, string]> {
        if (this.tree == null) {
            await this.#initialize()
        }
        const allNodes = this.tree.search({minX: lng, maxX: lng, minY: lat, maxY: lat})
        const nodes = allNodes.filter(subdivision => this.geometryManager.getGeometryById(subdivision.id).containsPoint([lng, lat]))
        if (nodes.length == 0) {
            return ['', '']
        }
        const code = this.featureManager.getCodeByGeometryId(nodes[0].id)
        const name = this.featureManager.getNameByCode(code)
        return [code, name]
    }

    async #getBoundsForCode(code: string): Promise<Polygon[][]> {
        const boundaries: Polygon[][] = []
        for(const geometryId of this.featureManager.getGeometriesByCode(code)) {
            const cavitatedPolygon = this.geometryManager.getGeometryById(geometryId)
            boundaries.push(cavitatedPolygon.toPoly())
        }
        return boundaries
    }

    // TODO: This should be done better
    async getBoundary(latLng: LatLong): Promise<[string, string, Polygon[][]]> {
        const [code, name] = await this.getCodeAndName(latLng.lat, latLng.lng)
        return [code, name, await this.#getBoundsForCode(code)]
    }

    // TODO: This should be done better
    async getCodeBoundaries(codes: string[]): Promise<Polygon[][][]> {
        return Promise.all(codes.map(code => this.#getBoundsForCode(code)))
    }

}