import { BBox } from 'rbush'
import { CavitatedPolygon } from './cavitated_polygon'
import { Polygon } from './gejson'

function minmax(arr: number[]): [number, number] {
    let minVal = arr[0]
    let maxVal = arr[0]
    for (const v of arr) {
        if (v < minVal) {
            minVal = v
        }
        if (v > maxVal) {
            maxVal = v
        }
    }
    return [minVal, maxVal]
}

export type GeometryId = number

// Generate CavitatedPolygon's from regular geojson geometry nodes.
export default class GeometryManager {
    nextId: GeometryId = 0
    geometriesById: Map<GeometryId, CavitatedPolygon> = new Map()
    addGeometry(poly: Polygon[]): [GeometryId, BBox] {
        const id = this.nextId
        this.nextId += 1
        const cavitatedPolygon: CavitatedPolygon = new CavitatedPolygon(poly[0].slice(), poly.slice(1))
        this.geometriesById.set(id, cavitatedPolygon)
        return [id, this.#computeBBox(cavitatedPolygon)]
    }
    #computeBBox(cavitatedPolygon: CavitatedPolygon): BBox {
        const xs: number[] = []
        const ys: number[] = []
        cavitatedPolygon.border.forEach(([x,y]) => {
            xs.push(x)
            ys.push(y)
        })
        const [[minX, maxX], [minY, maxY]] = [minmax(xs), minmax(ys)]
        return {minX, maxX, minY, maxY}
    }
    getGeometryById(id: GeometryId): CavitatedPolygon {
        if (!this.geometriesById.has(id)) {
            return null
        }
        return this.geometriesById.get(id)
    }
}