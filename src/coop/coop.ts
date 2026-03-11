export enum CoopMode {
    Driving = 'driving',
    Mapping = 'mapping',
}

export type SetCoopMode = {
    gameId: string
    mode: CoopMode
}

export type CoopModesById = {
    [gameId: string]: {
        mode: CoopMode
    }
}
