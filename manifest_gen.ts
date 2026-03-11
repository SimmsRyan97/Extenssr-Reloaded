import type { PackageJson, JsonObject } from 'type-fest'

export type ManifestVersion = 2 | 3

const appName = 'Extenssr Reloaded'
const background_script = 'worker.bundle.js'
const content_scripts = ['content.bundle.js']
const css_files = ['css/styles.css', 'css/xterm.css']
const permissions = [
    // For logging in to Twitch; this will make more sense once Chatguessr is readded
    // 'identity',
    // For persisting data locally
    'storage',
    'unlimitedStorage',
]
const popup = 'popup.html'
const icons = {
    '48': 'icons/extenssr_48.png',
    '128': 'icons/extenssr_128.png',
}
const domains = ['https://www.geoguessr.com/*']
const extra_resources = [
    'icons/*.png',
    'icons/*.svg',
    'inject_main.bundle.js',
    'ai_worker.bundle.js',
    'geojson_data/*.geojson',
    'models/*',
    'wasm/*',
]

const commonManifest = (pkg: PackageJson) => {
    return {
        name: appName,
        version: pkg.version,
        description: pkg.description,
        icons: icons,
        content_scripts: [{
            matches: domains,
            run_at: 'document_start',
            js: content_scripts,
            css: css_files,
        }],
        permissions: permissions
    }
}
const genV3 = (pkg: PackageJson) => {
    return Object.assign({}, commonManifest(pkg), {
        background: {
            service_worker: background_script
        },
        action: {
            default_popup: popup
        },
        web_accessible_resources: [
            {
                resources: extra_resources,
                matches: domains
            }
        ],
        manifest_version: 3
    })
}

const genV2 = (pkg: PackageJson) => {
    return Object.assign({}, commonManifest(pkg), {
        background: {
            scripts: [background_script],
            persistent: false,
        },
        browser_action: {
            default_popup: popup
        },
        permissions: permissions.concat(['https://game-server.geoguessr.com/*']),
        web_accessible_resources: extra_resources,
        manifest_version: 2
    })
}

export default function generateManifest(manifestVersion: ManifestVersion, pkg: PackageJson): JsonObject {
    if (manifestVersion === 2) {
        return genV2(pkg)
    }
    return genV3(pkg)
}
