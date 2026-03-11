import { inject, injectable } from 'inversify'
import { BattleRoyaleApi, IBattleRoyaleApi } from './battle_royale'
import GameApi, { IGameApi } from './game'
import MapsApi, { IMapsApi } from './maps'
import PartyApi, { IPartyApi } from './party'

import config from '../inversify.config'
import { AxiosInstance } from 'axios'

export interface IApiProvider {
    battleRoyaleApi: IBattleRoyaleApi
    gameApi: IGameApi
    mapsApi: IMapsApi
    partyApi: IPartyApi
}

@injectable()
export class DefaultApiProvider implements IApiProvider {
    battleRoyaleApi: BattleRoyaleApi
    gameApi: IGameApi
    mapsApi: IMapsApi
    partyApi: IPartyApi
    constructor(
        @inject(config.Client) client: AxiosInstance,
        @inject(config.GameServerClient) gameServer: AxiosInstance,
    ) {
        this.battleRoyaleApi = new BattleRoyaleApi(gameServer)
        this.gameApi = new GameApi(client)
        this.mapsApi = new MapsApi(client)
        this.partyApi = new PartyApi(client)
    }
}