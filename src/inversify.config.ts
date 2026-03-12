const CONFIG = {
    Client: Symbol.for('Client'),
    GameServerClient: Symbol.for('GameServerClient'),

    ApiProvider: Symbol.for('ApiProvider'),

    MaterialHandler: Symbol.for('MaterialHandler'),
    EndpointTransitionHandler: Symbol.for('EndpointTransitionHandler'),

    ChromeStorage: Symbol.for('ChromeStorage'),
    ContentAndBackgroundMessageBroker: Symbol.for('ContentAndBackgroundMessageBroker'),
    ChromeContentToInjectedBroker: Symbol.for('ChromeContentToInjectedBroker'),

    BaseLogger: Symbol.for('BaseLogger'),

    // Apis
    BattleRoyaleApi: Symbol.for('BattleRoyaleApi'),
    GameApi: Symbol.for('GameApi'),
    MapsApi: Symbol.for('MapsApi'),
    PartyApi: Symbol.for('PartyApi'),

    // Scripts and their associated plugins and helpers

    // Game script
    GameScript: Symbol.for('GameScript'),
    GameStateProxiesProvider: Symbol.for('GameStateProxiesProvider'),
    GameInfoProvider: Symbol.for('GameInfoProvider'),
    LocationSaverGamePlugin: Symbol.for('LocationSaverGamePlugin'),
    RouteSaverGamePlugin: Symbol.for('RouteSaverGamePlugin'),
    EasterEggGamePlugin: Symbol.for('EasterEggGamePlugin'),
    CountryStreakGamePlugin: Symbol.for('CountryStreakGamePlugin'),

    // Challenge script, extends game script
    ChallengeScript: Symbol.for('ChallengeScript'),
    CoopChallengePlugin: Symbol.for('CoopChallengePlugin'),

    // Map script
    MapScript: Symbol.for('MapScript'),
    MapStateProxiesProvider: Symbol.for('MapsStateProxiesProvider'),
    MapInfoProvider: Symbol.for('MapInfoProvider'),
    CountryStreaksMapPlugin: Symbol.for('CountryStreaksMapPlugin'),
    CoopMapPlugin: Symbol.for('CoopMapPlugin'),

    // Battle royale script
    BattleRoyaleScript: Symbol.for('BattleRoyaleScript'),
    BattleRoyaleAvatarsPlugin: Symbol.for('BattleRoyaleAvatarsPlugin'),
    BattleRoyaleShowLocationsPlugin: Symbol.for('BattleRoyaleShowLocationsPlugin'),
    BattleRoyaleLocationSaverPlugin: Symbol.for('BattleRoyaleLocationSaverPlugin'),
    BattleRoyaleGameIdProvider: Symbol.for('BattleRoyaleGameIdProvider'),

    // Results script
    ResultsScript: Symbol.for('ResultsScript'),
    ResultsInfoProvider: Symbol.for('ResultsInfoProvider'),
    ResultsBlockPlugin: Symbol.for('ResultsBlockPlugin'),
    ResultsRoutePlugin: Symbol.for('ResultsRoutePlugin'),
    ResultsMapsLinksPlugin: Symbol.for('ResultsMapsLinksPlugin'),

    // Map maker script
    MapMakerScript: Symbol.for('MapMakerScript'),
    MapMakerMapIdProvider: Symbol.for('MapMakerMapIdProvider'),
    LocationSaverMapMakerPlugin: Symbol.for('LocationSaverMapMakerPlugin'),

    // Global plugins
    MenuItemsPlugin: Symbol.for('MenuItemsPlugin'),
    TextModePlugin: Symbol.for('TextModePlugin'),
    BlinkModePlugin: Symbol.for('BlinkModePlugin'),
    RandomizerPlugin: Symbol.for('RandomizerPlugin'),
    FocusRingPlugin: Symbol.for('FocusRingPlugin'),
    TrollImagePlugin: Symbol.for('TrollImagePlugin'),
    DebugHandler: Symbol.for('DebugHandler')
}
export default CONFIG