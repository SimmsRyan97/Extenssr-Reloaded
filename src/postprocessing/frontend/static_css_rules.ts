import { addStaticCSSWhenProperty, addStaticCSSWhenPropertyTrue } from 'postprocessing/frontend/css_rules'
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

    addStaticCSSWhenProperty('enableTimer', storage, {
        true: `
        /* when the guess map is max size, it overlaps with our timer bar…
         * this way the timer bar shows over top the map, which is a bit better */
        .game-layout__status {
            z-index: 21;
        }
        [data-qa="game-layout-status"] {
            z-index: 21;
        }

        .game-layout__status > div {
            width: max-content;
            margin-left: auto;
        }
        [data-qa="game-layout-status"] > div {
            width: max-content;
            margin-left: auto;
        }

        .extenssr__game-timings {
            margin-top: .5rem;
        }
        .extenssr__game-timings--floating {
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 10000;
            margin-top: 0;
            border-radius: 8px;
            background: rgba(18, 18, 22, 0.82);
            backdrop-filter: blur(4px);
        }
        .extenssr__game-timings__content {
            padding: .5rem 0 .5rem 1rem;
        }
        .extenssr__game-timings--floating .extenssr__game-timings__content {
            padding: .35rem .65rem;
        }
        .extenssr__result-timings {
            margin: auto auto 1.5rem auto;
            width: max-content;
        }

        .extenssr__timer-bar {
            display: flex;
            flex-wrap: wrap;
        }

        .extenssr__timer-element {
            padding: 8px 16px;
        }
        .extenssr__timer-element__heading {
            text-align: center;
            color: var(--ds-color-purple-20);
            font-size: var(--font-size-10);
            font-weight: 700;
            font-style: italic;
        }
        .extenssr__timer-element__body {
            font-weight: bold;
        }
    `,
        // Cheeky way to "disable" the timer
        // TODO(reanna): ideally I think we would make it possible to add/remove entire plugins
        // based on a setting. This would be good for coop and the round timer but possibly also
        // other additions in the future. But we can look at that when the FSM and plugin
        // initialisation are more robust.
        false: `
        .extenssr__game-timings { display: none }
        .extenssr__result-timings { display: none }
    `,
    })
}