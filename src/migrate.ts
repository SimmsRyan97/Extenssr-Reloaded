/**
 * Migration code for when we update a storage format or something like that.
 */

import browser from 'webextension-polyfill'

async function migrateSettingKeys() {
    const newKeyNames = {
        bn: 'botName',
        cn: 'channelName',
        cwo: 'cgWindowOpen',
        cgr: 'cgReady',
        cggi: 'cgGameId',
        twi: 'twitchWindowId',
        am: 'enableAccessibilityMode',
        bdc: 'bdcKey',
        ns: 'nextStreakId',
        pxl: 'pixelateMap',
        pls: 'pixelateScale',
        gs: 'grayscale',
        c: 'showCompass',
        nc: 'showNewCompass',
        sc: 'showCar',
        ca: 'chromaticAberration',
        t: 'toon',
        ts: 'toonScale',
        s: 'sobel',
        eef: 'enableExperimentalFeatures',
        dbg: 'debuggable',
        bba: 'blurBrAvatars',
        bbg: 'blurBrGuesses',
        hbn: 'hideBrNames',
        og: 'oneGuess',
        bl: 'blockList',
        crm: 'coopMode',
        ent: 'enableTimer',
        snw: 'snowing',
        lts: 'lights',
    }

    const oldKeys = await browser.storage.local.get(Object.keys(newKeyNames))
    if (Object.keys(oldKeys).length > 0) {
        const updates: Record<string, unknown> = Object.fromEntries(
            Object.entries(oldKeys).map(([oldKeyName, value]) => [newKeyNames[oldKeyName], value])
        )
        await browser.storage.local.set(updates)
        await browser.storage.local.remove(Object.keys(oldKeys))
    }

    // Keys that haven't been used in a while, not worth migrating
    await browser.storage.local.remove(['g2s', 'sbi', 'rs'])
}

async function migrate(): Promise<void> {
    await migrateSettingKeys()
}

export default migrate
