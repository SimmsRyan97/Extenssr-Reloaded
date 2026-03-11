import { addStaticCSSWhenPropertyTrue } from 'postprocessing/frontend/css_rules'
import { ChromeStorage } from 'storage/chrome_storage'

export default function addCssRules(storage: ChromeStorage): void {
    addStaticCSSWhenPropertyTrue('hideCompass', storage, `
    .compass {
        display: none;
    }
    .game-layout__compass {
        display: none;
    }
    [data-qa="compass"] {
        display: none;
    }
`)

    addStaticCSSWhenPropertyTrue('enableAccessibilityMode', storage, `
    div[data-qa="guess-map-selected-region"] {
        top: 1.75rem;
        right: 1rem;
        bottom: inherit;
        left: inherit;
    }
    div[data-qa="guess-map-selected-region"] > .guess-map__selected-region-icon > img {
        width: 3.5rem;
    }
`)
}