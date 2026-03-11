import {IGameApi} from 'api/game'
import { ChromeStorage } from 'storage/chrome_storage'
import { GlobalPlugin } from '../../endpoint_transition_handler'
import { InternalOnlyMessageBroker, Message } from 'messaging/broker'
import TextOnlyGame from './text_only_game'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

export type InternalMessages = {
    enabled: Message<boolean>
    start16Bit: Message<void>
}

export class Broker extends InternalOnlyMessageBroker<InternalMessages> { }

@injectable()
export default class TextModePlugin implements GlobalPlugin {
    #api: IGameApi
    #storage: ChromeStorage
    #textGames: string[] = []
    #broker: Broker
    #path = ''
    #textOnlyGame: TextOnlyGame = null
    #chromeBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker

    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.ContentAndBackgroundMessageBroker) chromeBroker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.GameApi) gameApi: IGameApi,
    ) {
        this.#api = gameApi
        this.#storage = storage
        this.#chromeBroker = chromeBroker
        this.#broker = new Broker()
        this.#innerBroker = innerBroker
        storage.getValue('textGames').then(val => {
            this.#textGames = val
            this.#checkGame()
        })
    }

    async #createGame(): Promise<void> {
        const { token } = await this.#api.createCountryStreak({ forbidMoving: true, forbidRotating: false, forbidZooming: false, timeLimit: 0 })
        this.#textGames.push(token)
        await this.#storage.setValue('textGames', this.#textGames.slice())
        const newUrl = `https://www.geoguessr.com/game/${token}`
        window.location.assign(newUrl)
    }

    #checkGame(): void {
        if (this.#path == '/' && window.location.hash === '#16bit') {
            this.#createGame()
            return
        }
        if (!this.#path.startsWith('/game')) {
            this.#showUI()
            const terminal = document.getElementById('terminal')
            if (terminal) {
                terminal.remove()
            }
            this.#chromeBroker.sendInternalMessage('startTextOnlyMode', false)
            return
        }
        const gameId = this.#path.split('/')[2]
        if (this.#textOnlyGame && this.#textOnlyGame.gameId === gameId) {
            return
        }
        if (this.#textGames.includes(gameId)) {
            this.#hideUI()
            this.#chromeBroker.sendInternalMessage('startTextOnlyMode', true)
            this.#startTerminal(gameId)
        } else {
            this.#chromeBroker.sendInternalMessage('startTextOnlyMode', false)
        }
    }

    #startTerminal(gameId: string): void {
        if (document.getElementById('terminal')) {
            return
        }
        const terminalDiv = document.createElement('div')
        terminalDiv.setAttribute('id', 'terminal')
        document.body.appendChild(terminalDiv)
        this.#textOnlyGame = new TextOnlyGame(terminalDiv, this.#api, gameId, this.#broker, this.#innerBroker)
    }

    #showUI(): void {
        const foo = document.getElementById('hide-ui-text-mode')
        if (foo) {
            foo.remove()
        }
    }

    #hideUI(): void {
        const foo = document.getElementById('hide-ui-text-mode')
        if (foo) {
            return
        }
        const styleNode = document.createElement('style')
        styleNode.textContent = `
            .game-layout__canvas > :not(.game-layout__panorama, #terminal) {
                display: none;
            }
            .game-layout__panorama {
                height: 50%;
            }
            #terminal {
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 50%;
                z-index: 1000;
            }
        `
        styleNode.setAttribute('id', 'hide-ui-text-mode')
        document.head.appendChild(styleNode)
    }

    onPathChange(path: string): void {
        this.#path = path
        this.#checkGame()
    }
}