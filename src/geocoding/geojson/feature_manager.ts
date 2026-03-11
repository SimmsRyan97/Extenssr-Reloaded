import { FeaturePropertyParser } from 'geocoding/geojson_reverse_geocode'
import { BBox } from 'rbush'
import { Feature, Polygon } from './gejson'
import GeometryManager, { GeometryId } from './geometry_manager'

// This is the RTree node structure.
export interface Subdivision extends BBox {
    id: GeometryId
}

export default class FeatureManager {
    geometriesByCode: Map<string, GeometryId[]> = new Map()
    codesByGeometryId: Map<GeometryId, string> = new Map()
    geometryManager: GeometryManager
    featurePropertyParser: FeaturePropertyParser
    codesToNames: Map<string, string> = new Map()
    constructor(geometryManager: GeometryManager, featurePropertyParser: FeaturePropertyParser) {
        this.geometryManager = geometryManager
        this.featurePropertyParser = featurePropertyParser
    }
    addFeature(feature: Feature): Subdivision[] {
        const subdivisions: Subdivision[] = []
        // Force it into a MultiPolygon
        const polys: Polygon[][] = []
        if (feature.geometry.type === 'Polygon') {
            polys.push(feature.geometry.coordinates as Polygon[])
        } else if (feature.geometry.type === 'MultiPolygon') {
            polys.push(...(feature.geometry.coordinates as Polygon[][]))
        } else {
            // Ignore?
            return subdivisions
        }
        const [code, name] = this.featurePropertyParser.getCodeAndName(feature.properties)
        this.codesToNames.set(code, name)
        const geometryIds: GeometryId[] = []
        for (const poly of polys) {
            const [geometryId, bbox] = this.geometryManager.addGeometry(poly)
            const subdivision: Subdivision = {id: geometryId, ...bbox}
            this.codesByGeometryId.set(geometryId, code)
            geometryIds.push(geometryId)
            subdivisions.push(subdivision)
        }
        this.geometriesByCode.set(code, geometryIds)
        return subdivisions
    }
    getGeometriesByCode(code: string): GeometryId[] {
        return this.geometriesByCode.get(code) || []
    }
    getCodeByGeometryId(geometryId: GeometryId): string {
        return this.codesByGeometryId.get(geometryId) || ''
    }
    getNameByCode(code: string): string {
        return this.codesToNames.get(code) || 'Unkown'
    }
}