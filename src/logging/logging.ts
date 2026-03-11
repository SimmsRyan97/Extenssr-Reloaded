export enum AbyssTag {
    NONE = 'none',
    DEBUG_HANDLER = 'debug_handler.ts',
    COUNTRY_STREAKS_GAME_PLUGIN = 'country_streaks_game_plugin.ts',
    COUNTRY_STREAKS_MAP_PLUGIN = 'country_streaks_map_plugin.ts',
    GAME_SCRIPT = 'game_script.ts',
    CHALLENGE_SCRIPT = 'challenge_script.ts',
    RESULTS_SCRIPT = 'results_script.ts',
    MAP_MAKER_SCRIPT = 'map_maker_script.ts',
    MAP_SCRIPT = 'map_script.ts',
    BATTLE_ROYALE_SCRIPT = 'battle_royale_script.ts',
    CSS_EFFECT_MATERIAL_HANDLER = 'css_effect_material_handler.ts',
    BATTLE_ROYALE_AVATARS_PLUGIN = 'battle_royale_avatars_plugin.ts',
    BATTLE_ROYALE_BLOCK_USERS_PLUGIN = 'battle_royale_block_users_plugin.ts',
    BATTLE_ROYALE_SHOW_LOCATIONS_PLUGIN = 'battle_royale_show_locations_plugin.ts',
    BATTLE_ROYALE_ONE_GUESS_PLUGIN = 'battle_royale_one_guess_plugin.ts',
    BATTLE_ROYALE_LOCATIONS = 'battle_royale_locations.tsx',
    CUSTOM_OPTIONS_PLUGIN = 'custom_options_plugin.tsx',
    PROFILE_SCRIPT = 'profile_script.ts',
    PROFILE_BLOCK_PLUGIN = 'profile_block_plugin.ts',
    CHALLENGE_BLOCK_PLUGIN = 'challenge_block_plugin.ts',
    RESULTS_BLOCK_PLUGIN = 'results_block_plugin.ts',
    RESULTS_ROUTE_PLUGIN = 'results_route_plugin.ts',
    EASTER_EGG_GAME_PLUGIN = 'easter_egg_game_plugin.ts',
    LOCATION_SAVER_GAME_PLUGIN = 'location_saver_game_plugin.ts',
    LOCATION_SAVER_BATTLE_ROYALE_PLUGIN = 'battle_royale_location_saver_plugin.ts',
    LOCATION_SAVER_MAP_MAKER_PLUGIN = 'location_saver_map_maker_plugin.ts',
    ROUTE_SAVER_GAME_PLUGIN = 'route_saver_game_plugin.ts',
    TIMER_PLUGIN = 'timer_plugin.tsx',
    CHALLENGE_COOP_PLUGIN = 'challenge_coop_plugin.ts',
    MAP_COOP_PLUGIN = 'map_coop_plugin.ts',
    ENDPOINT_TRANSITION_HANDLER = 'endpoint_transition_handler.ts',
    IRC = 'irc.ts',
    PUB_SUB = 'pubsub.ts',
    TWITCH_BOT = 'twitch_bot.ts',
    LEADERBOARD = 'leaderboard.tsx',
    WORKER = 'worker_main.ts',
    BROKER = 'messages.ts',
    STREAKS_HANDLER = 'streaks_handler.ts',
    ROUTES_DB = 'routes.ts',
    AVATARS_DB = 'avatars.ts',
    LOCATION_HANDLER = 'location_handler.ts',
    TROLL_IMAGE_PLUGIN = 'troll_image_plugin.ts'
}

export type AbyssMessage = {
    timestamp: number
    source: AbyssTag
    message: string
}

export interface ILogger {
    log(message: string): void
    withTag(tag: AbyssTag): ILogger
}
