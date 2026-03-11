import { LatLong } from 'api/game'
import { Route } from 'route_saving/route'
import { SavedLocation } from 'location_saving/location'
import { Polygon } from 'geocoding/geojson/gejson'
import { Message } from './broker'
import { BattleRoyaleWebsocketMessage } from 'api/battle_royale'
import { ShaderInfo } from 'postprocessing/frontend/shader_pass'

export type WindowMessageV2 = {
    // Content -> Injected
    hideCar: Message<boolean>
    // Injected -> Content
    requestExtBaseUrl: Message<void, string>
    // Injected -> Content
    requestMaterial: Message<void>
    // Content -> Injected
    updateMaterial: Message<ShaderInfo>
    // Injected -> Content
    updatePosition: Message<LatLong>
    // Injected -> Content
    goHome: Message<void>
    // Content -> Injected
    showRoutes: Message<Route>
    // Content -> Injected
    clearRoutes: Message<void>
    // Content -> Injected
    queryLocation: Message<void, {pos: LatLong, heading: number, pitch: number }>
    // Content -> Injected
    takeScreenshot: Message<void, Uint8Array>
    // Content -> Injected
    savedLocationsSelected: Message<SavedLocation[]>
    // Content -> Injected
    clearSavedLocations: Message<void>
    // Injected -> Content
    wsData: Message<BattleRoyaleWebsocketMessage>
    // Content -> Injected
    updatePov: Message<{heading: number, pitch: number, zoom: number}>
    // Content -> Injected
    freezeShortcuts: Message<void>
    // Content -> Injected
    countrySelect: Message<boolean>
    // Content -> Injected
    clearStreaksBoundary: Message<void>
    // Injected -> Content
    streaksClick: Message<LatLong>
    // Content -> Injected
    streaksBoundary: Message<Polygon[][]>
    // Content -> Injected
    streaksGoodResult: Message<{boundary: Polygon[][]}>
    // Content -> Injected
    streaksBadResult: Message<{expectedBoundary:Polygon[][], boundary: Polygon[][]}>
    // Injected -> Injected
    refreshOffscreenContent: Message<void>
    // Injected -> Content
    regionSelectorLoaded: Message<void>
    // Injected -> Content
    changeUrl: Message<string, string>
    // Injected -> Content
    changePov: Message<[number, number]>
}