/**
 * All these classes are part of the response to the /api/v3/game endpoint
 */

import { AxiosInstance } from 'axios'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'

export type Map = {
    id: string,
    name: string,
    slug: string,
    description?: string,
    url?: string,
    playUrl?: string,
    creator?: MapCreator
}

export type MapSearchResult = {
    id: string
    name: string
    creator: string
}

export type MapCreator = {
    email?: string
    nick: string
}

export interface IMapsApi {
    search(query: string, page: number, count: number): Promise<MapSearchResult[]>
    getMapData(mapId: string): Promise<Map>
    getMyMaps(page: number, count: number): Promise<Map[]>
    getLikedMaps(page: number, count: number): Promise<Map[]>    
}

@injectable()
export default class MapsApi implements IMapsApi {
    #client: AxiosInstance
    constructor(
        @inject(config.Client) client: AxiosInstance
    ) {
        this.#client = client
    }
    async search(query: string, page = 0, count = 101): Promise<MapSearchResult[]> {
        return (await this.#client.get<MapSearchResult[]>('/api/v3/search/map', { params: { page, count, q: query } })).data
    }

    async getMapData(mapId: string): Promise<Map> {
        return (await this.#client.get<Map>(`/api/maps/${mapId}`)).data
    }

    async getMyMaps(page = 0, count = 25): Promise<Map[]> {
        const { data } = await this.#client.get<Map[]>('/api/v3/profiles/maps', {
            params: { page, count },
        })

        return data
    }

    async getLikedMaps(page = 0, count = 25): Promise<Map[]> {
        const { data } = await this.#client.get<Map[]>('/api/v3/likes', {
            params: { page, count },
        })

        return data
    }
}
