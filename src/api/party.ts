import { AxiosInstance } from 'axios'
import { inject, injectable } from 'inversify'
import config from '../inversify.config'

export interface IPartyApi {
    ban(partyId: string, userId: string): Promise<void>
    unban(partyId: string, userId: string): Promise<void>
    getInfo(partyId: string): Promise<PartyResponse>
    getJoinedParties(): Promise<PartyInfo[]>
}

export type PartyUserInfo = {
    id: string,
    name: string,
    avatarUrl: string,
}

export type PartyInfo = {
    id: string,
    name: string,
    creator: PartyUserInfo,
    players: PartyUserInfo[],
    bannedPlayers: PartyUserInfo[]
}

export type PartyResponse  = {
    party: PartyInfo,
    hasJoined: boolean
}

@injectable()
export default class PartyApi implements IPartyApi {
    #client: AxiosInstance
    constructor(
        @inject(config.GameServerClient) client: AxiosInstance
    ) {
        this.#client = client
    }

    async getJoinedParties(): Promise<PartyInfo[]> {
        return (await this.#client.get<PartyInfo[]>('/api/parties')).data
    }    

    async ban(partyId: string, userId: string): Promise<void> {
        await this.#client.post(`/api/parties/${partyId}/ban`, {userId, ban: true})
    }

    async unban(partyId: string, userId: string): Promise<void> {
        await this.#client.post(`/api/parties/${partyId}/ban`, {userId, ban: false})
    }

    async getInfo(partyId: string): Promise<PartyResponse> {
        return (await this.#client.get<PartyResponse>(`/api/parties/${partyId}`)).data
    }

}