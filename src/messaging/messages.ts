/**
 * Messages between service worker and content script or popup
 */

import { Game, LatLong } from 'api/game'
import { AbyssMessage } from 'logging/logging'
import { Route, AddPosToGameRound, GameAndRoundId } from 'route_saving/route'
import { Streak, NewSeedForStreak } from 'streak/streak'
import { SetCoopMode } from 'coop/coop'
import { SettingsKeys } from 'storage/storage'
import { BattleRoyaleGameState, BattleRoyaleLobby } from '../api/battle_royale'
import { Message } from './broker'
import { Polygon } from 'geocoding/geojson/gejson'
import { LocationSource, SavedLocation } from 'location_saving/location'
import { ScreenshotDTO } from 'databases/saved_locations'

export type Messages = {
    setValue: Message<Partial<SettingsKeys>>
    ping: Message<void>
    frameEnd: Message<void>
    emitDone: Message<void>
    reloadExtension: Message<void>
    reloadPage: Message<void>
    abyssMessage: Message<AbyssMessage>
    startStreak: Message<Game>
    queryStreak: Message<string, Streak>
    streakRoundEnd: Message<Game, Streak>
    streakNextSeed: Message<NewSeedForStreak>
    requestBrLocations: Message<void>
    brUpdateLocations: Message<BattleRoyaleGameState>
    addPosToGameRoundRoute: Message<AddPosToGameRound>
    goHomeInGameRoundRoute: Message<GameAndRoundId>
    queryGameRoundRoute: Message<GameAndRoundId, Route>
    setCoopMode: Message<SetCoopMode>
    triggerFlash: Message<void>
    notifyUpdateLocations: Message<void>
    startTextOnlyMode: Message<boolean>
    notifyScreenshotForLocationId: Message<number>
    updateLobbyData: Message<BattleRoyaleLobby>
    getBounds: Message<LatLong, [string, string, Polygon[][]]>
    getCodeBounds: Message<string[], Polygon[][][]>
    getUnlockedLocations: Message<void, SavedLocation[]>
    getScreenshotForLocationId: Message<number, ScreenshotDTO>
    addLocation: Message<SavedLocation, number>
    addScreenshot: Message<ScreenshotDTO>
    unlockLocation: Message<LocationSource>
    deleteLocation: Message<SavedLocation>
    newRound: Message<void>
    randomize: Message<void>
    checkAvatar: Message<string>
    queryAllAvatarDecisions: Message<void, [string[], string[]]>
    avatarDecision: Message<[string, boolean]>
    getUserForAvatarId: Message<string, string>
    // Debug only
    compileShader: Message<string, string>
    toggleShader: Message<boolean>
}
