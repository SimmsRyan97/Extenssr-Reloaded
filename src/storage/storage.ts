import { AbyssMessage } from 'logging/logging'
import { CoopModesById } from 'coop/coop'

/**
 * Data that needs to persist tends to be split in two categories:
 * - settings which are fully persistent and generally have sane defaults;
 *   the UI needs to react to these changes
 * - data which is required for a small to medium term period and generally
 *   defaults to empty; these are generally used to store data in between states.
 */

export class SettingsKeys {
    // Chatguessr keys
    botName = ''
    channelName = ''
    cgWindowOpen = false
    cgReady = false
    cgGameId = ''
    twitchWindowId = -1

    // A11y
    enableAccessibilityMode = false

    // For country streaks
    nextStreakId = 0

    // Post-processing keys
    pixelateMap = false
    pixelateScale = 40.0
    grayscale = false
    hideCompass = false
    showCar = true
    chromaticAberration = false
    toon = false
    toonScale = 11.0
    sobel = false
    aiOverlay = false
    drunk = false
    vignette = false
    invert = false
    sepia = false
    mirror = false
    fisheye = false
    water = false
    bloom = false
    min = false
    motionBlur = false

    // Non-standard, debug stuff
    enableExperimentalFeatures = false
    logs: AbyssMessage[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: any[] = []
    debuggable = false

    // BR settings
    blurBrAvatars = false
    blurBrGuesses = false
    hideBrNames = false
    oneGuess = false
    blockList: string[] = []

    coopMode: CoopModesById = {}

    snowing = false
    lights = false
    randomizer = false
    scramble = false

    // Focus ring challenge mode
    focusRingEnabled = false
    focusRingSize = 42
    focusRingShape: 'circle' | 'square' | 'triangle' | 'star' = 'circle'

    // Deterministic challenge randomizer mode
    challengeSeedEnabled = false
    challengeSeed = ''
    challengeSeedStep = 0

    // Strimmer options
    replaceAvatars = false

    textGames: string[] = []

    // Blink mode (show panorama briefly at round start, then black screen)
    blinkEnabled = false
    blinkMode: 'fixed' | 'decrease' | 'random' = 'fixed'
    blinkTimeSeconds = 1.5
    blinkDecreaseStepSeconds = 0.5
    blinkMinTimeSeconds = 1.0
    blinkRandomMaxSeconds = 8.0
    blinkRoundDelaySeconds = 0
}
