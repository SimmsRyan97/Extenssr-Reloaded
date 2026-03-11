import { LatLong } from 'api/game'
import {encode, decode} from 'base64-arraybuffer'
export enum SourceType {
    GAME,
    BR
}

export class LocationSource {
    type: SourceType
    gameId: string
    roundId: number
    mapName: string
}

export class SavedLocation extends LocationSource {
    id?: number
    pos: LatLong
    heading?: number
    pitch?: number
    locked: number // boolean is not indexable
}

export function stringToBlob(str: string): Blob {
    return new Blob([decode(str)])
}

export async function blobToString(blob: Blob): Promise<string> {
    return encode(await blob.arrayBuffer())
}
