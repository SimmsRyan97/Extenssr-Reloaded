import { Polygon, Point } from './gejson'
import pointInPolygon from 'point-in-polygon'

// A cavitated polygon is the equivalent of a geojson 'Polygon' feature.
export class CavitatedPolygon {
    readonly border: Polygon
    readonly exclusions: Polygon[]
    constructor(border: Polygon, exclusions: Polygon[]) {
        this.border = border
        this.exclusions = exclusions
    }
    toPoly(): Polygon[] {
        return [this.border].concat(this.exclusions)
    }
    containsPoint(point: Point): boolean {
        if (!pointInPolygon(point, this.border)) {
            return false
        }
        for (const exclusion of this.exclusions) {
            if (pointInPolygon(point, exclusion)) {
                return false
            }
        }
        return true
    }
}