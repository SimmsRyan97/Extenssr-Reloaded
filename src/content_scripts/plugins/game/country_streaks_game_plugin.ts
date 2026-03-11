import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { GameInfoProvider } from 'content/endpoints/game_script'
import { AbyssTag, ILogger } from 'logging/logging'
import { Streak, computeStreakSize } from 'streak/streak'
import { Game, GameType, IGameApi } from 'api/game'
import { GameFSM, GameScriptState } from 'content/state_machines/game'

import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

/**
 * Plugin for the /game endpoint related to country streak functionality
 */

const STREAKS_CONTAINER = 'streaks-container'
const STREAKS_BODY = 'streaks-body'

// TODO: Way too many querySelector's. Should all be consolidated into state proxies.
@injectable()
export default class CountryStreakGamePlugin extends EndpointPlugin implements StateChangeListener<GameScriptState> {
    enabled = false
    #messageBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #api: IGameApi
    #gameInfoProvider: GameInfoProvider

    constructor(
        @inject(config.GameInfoProvider) gameInfoProvider: GameInfoProvider,
        @inject(GameFSM) fsm: GameFSM,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.GameApi) api: IGameApi,
    ) {
        super(logger, AbyssTag.COUNTRY_STREAKS_GAME_PLUGIN)
        fsm.addStateChangeListener(this)
        this.#messageBroker = broker
        this.#innerBroker = innerBroker
        this.#api = api
        this.#gameInfoProvider = gameInfoProvider
        innerBroker.createListener('streaksClick', '', async (pos) => {
            if (!this.enabled) {
                return
            }
            const [code, name, boundary] = await this.#messageBroker.sendMessage('getBounds', pos)
            this.#showSelectedCountry(code, name)
            innerBroker.sendExternalMessage('streaksBoundary', boundary)
        })
        innerBroker.createListener('regionSelectorLoaded', '', () => {
            innerBroker.sendExternalMessage('countrySelect', this.enabled)
        })
    }
    async onStateChange(state: GameScriptState): Promise<void> {
        this.enabled = false
        const msg: Streak = await this.#messageBroker.sendMessage('queryStreak', this.#gameInfoProvider.gameId)
        if (!msg) {
            return
        }
        this.enabled = true
        if (state === GameScriptState.GUESS) {
            this.#innerBroker.sendExternalMessage('countrySelect', true)
            this.#setInGameStreak(computeStreakSize(msg))
        } else if (state === GameScriptState.ROUND_RESULT) {
            this.#innerBroker.sendExternalMessage('clearStreaksBoundary', null)
            const lastGame = msg.games[msg.games.length - 1]
            if (lastGame.rounds.length === 5) {
                this.addressStreakResult(msg)
            } else {
                const game: Game = await this.#api.getGameData(this.#gameInfoProvider.gameId)
                const streakResult: Streak = await this.#messageBroker.sendExternalMessage('streakRoundEnd', game)
                this.addressStreakResult(streakResult)
            }
        } else if (state === GameScriptState.FINAL_RESULT) {
            this.#innerBroker.sendExternalMessage('clearStreaksBoundary', null)
            this.startNewGame(msg.streakId, msg)
        }
    }

    messageListenerName(): string {
        return 'CountryStreakGamePlugin'
    }

    protected deinitImpl(): void {
        const streakNode = document.getElementById(STREAKS_CONTAINER)
        if (streakNode) {
            streakNode.parentElement.removeChild(streakNode)
        }
        this.#innerBroker.sendExternalMessage('countrySelect', false)
    }

    #setInGameStreak(streakValue: number): void {
        const score = document.querySelector('*[data-qa="score"]')
        if (!score) {
            return
        }
        const streakValueNode = document.getElementById(STREAKS_BODY)
        if (streakValueNode) {
            streakValueNode.textContent = `${streakValue}`
            return
        }
        const streakNode = score.cloneNode(true) as Element
        streakNode.setAttribute('id', STREAKS_CONTAINER)
        streakNode.childNodes[0].textContent = 'Streak'
        const newStreakValueNode = streakNode.childNodes[1] as Element
        newStreakValueNode.setAttribute('id', STREAKS_BODY)
        newStreakValueNode.textContent = `${streakValue}`
        score.insertAdjacentElement('afterend', streakNode)
    }

    handleLastRound(streak: Streak, correctGuess: boolean): void {
        this.logger.log('Handle last round')
        const viewSummaryButton = document.querySelector('#new-streaks-container *[data-qa="close-round-result"]')
        viewSummaryButton.querySelector('span').textContent = correctGuess ? 'PLAY NEXT ROUND' : 'GUESS WAS ACTUALLY RIGHT'
        viewSummaryButton.addEventListener('click', (evt) => {
            this.startNewGame(streak.streakId, streak)
            evt.preventDefault()
            evt.stopPropagation()
        })
    }

    handleDownloadStreakData(streak: Streak): void {
        const viewSummaryButton = document.querySelector('#new-streaks-container *[data-qa="close-round-result"]')
        const newButton = viewSummaryButton.cloneNode(true) as Element
        newButton.removeAttribute('data-qa')
        newButton.setAttribute('style', 'margin: 1rem;')
        newButton.querySelector('span').textContent = 'Download streak data'
        newButton.addEventListener('click', () => {
            const a = document.createElement('a')
            const file = new Blob([JSON.stringify(streak)], { type: 'application/json' })
            a.href = URL.createObjectURL(file)
            a.download = 'streak.json'
            a.click()
            URL.revokeObjectURL(a.href)
        })
        viewSummaryButton.insertAdjacentElement('afterend', newButton)
    }

    async startNewGame(streakId: number, streak: Streak): Promise<void> {
        const game = await this.#api.createGame(streak.mapId, GameType.STANDARD, streak.settings)
        await this.#messageBroker.sendMessage('streakNextSeed', {newGame: game, streakId: streakId})
        const newUrl = `https://www.geoguessr.com/game/${game.token}`
        window.location.assign(newUrl)
    }

    #showSelectedCountry(code: string, name: string): void {
        this.#hideSelectedCountry()
        if (code === '') {
            return
        }
        const newDiv = document.createElement('div')
        newDiv.classList.add('guess-map__selected-region')
        newDiv.classList.add('guess-map__selected-region--visible')
        const icon = document.createElement('div')
        icon.classList.add('guess-map__selected-region-icon')
        const img = document.createElement('img')
        img.setAttribute('src', this.#flagImageUrl(code))
        icon.appendChild(img)
        const label = document.createElement('div')
        label.classList.add('guess-map__selected-region-label')
        label.textContent = name
        newDiv.appendChild(icon)
        newDiv.appendChild(label)
        const nextSibling = document.querySelector('.guess-map__guess-button')
        if (!nextSibling) {
            return
        }
        nextSibling.insertAdjacentElement('beforebegin', newDiv)
     }
    #hideSelectedCountry(): void {
        const foo = document.querySelector('.guess-map__selected-region.guess-map__selected-region--visible')
        if (foo) {
            foo.remove()
        }
    }

    addressStreakResult(streak: Streak): void {
        const lastGame = streak.games[streak.games.length - 1]
        const lastRound = lastGame.rounds[lastGame.rounds.length - 1]
        const lastGuessCode = lastRound.guessCode
        const lastGuessCountryName = lastRound.guessCountryName
        const lastTargetCode = lastRound.targetCode
        const lastTargetCountryName = lastRound.targetCountryName
        const streakSize = computeStreakSize(streak)
        const correctGuess = (lastGuessCode === lastTargetCode) && (lastGuessCode !== null)

        const oldContainer = document.querySelector('*[data-qa="result-view-bottom"] > div > div')
        if (!oldContainer) {
            return
        }
        const newContainer = this.#cloneResultsContainer(oldContainer)
        this.#innerBroker.sendExternalMessage('countrySelect', false)
        if (correctGuess) {
            this.#addressGoodGuess(lastGuessCode, lastGuessCountryName, newContainer, streakSize)
        } else {
            this.#addressBadGuess(lastGuessCode, lastGuessCountryName, lastTargetCode, lastTargetCountryName, newContainer, Math.max(streakSize - 1, 0), streak.mapId)
        }
        if (lastGame.rounds.length === 5) {
            this.handleLastRound(streak, correctGuess)
        } else {
            newContainer.querySelector('*[data-qa="close-round-result"]').addEventListener('click', () => {
                (oldContainer.querySelector('*[data-qa="close-round-result"]') as HTMLButtonElement).click()
            })
        }
        this.handleDownloadStreakData(streak)
    }

    #cloneResultsContainer(oldContainer: Element): Element {
        const newContainer = oldContainer.cloneNode(true) as Element
        oldContainer.setAttribute('style', 'display: none;')
        const oldGuess = newContainer.querySelector('*[data-qa="guess-description"]')
        oldGuess.removeAttribute('data-qa')
        const guess = oldGuess.cloneNode(true) as Element
        guess.classList.add('guess')
        oldGuess.insertAdjacentElement('afterend', guess)
        oldContainer.insertAdjacentElement('afterend', newContainer)
        newContainer.setAttribute('id', 'new-streaks-container')
        return newContainer
    }

    #flagImageUrl(countryCode: string): string {
        if (countryCode === '') {
            return chrome.runtime.getURL('/icons/shrug.svg')
        }
        return `/static/flags/${countryCode.toUpperCase()}.svg`
    }

    #addressGoodGuess(guessCode: string, guessCountryCode: string, containerSection: Element, streakCount: number): void {
        this.#messageBroker.sendMessage('getCodeBounds', [guessCode]).then(([goodBounds]) => {
            this.#innerBroker.sendExternalMessage('streaksGoodResult', {boundary: goodBounds})
        })
        containerSection.querySelector('.guess').textContent = `Your streak is now at ${streakCount}`
        const resultIndicator = this.#flagImage(guessCode, guessCountryCode, null)
        containerSection.insertBefore(resultIndicator, containerSection.firstChild)
    }
    #flagImage(guessCode: string, guessCountryName: string, title: string): HTMLElement {
        const unknownCountry = guessCountryName === 'Unknown'
        const resultIndicator = document.createElement('div')
        const spanCircle = document.createElement('span')
        const img = document.createElement('img')
        const countryNameP = document.createElement('p')
        const titleP = document.createElement('p')

        resultIndicator.appendChild(spanCircle)
        spanCircle.appendChild(img)
        if (title) {
            spanCircle.insertAdjacentElement('afterend', titleP)
            titleP.insertAdjacentElement('afterend', countryNameP)
        } else {
            spanCircle.insertAdjacentElement('afterend', countryNameP)
        }

        resultIndicator.setAttribute('style', 'margin-top: -4.5rem; padding: .375rem;')
        spanCircle.setAttribute('style', 'width: 4rem;height: 4rem;display: block;border-radius: 100%;padding: .375rem;margin: auto;background: white;box-shadow: var(--shadow-1);')
        img.setAttribute('src', this.#flagImageUrl(guessCode))
        img.setAttribute('style', `width: 100%;height: 100%;border-radius: 100%;object-fit: ${unknownCountry ? 'fill' : 'cover'};`)
        titleP.textContent = title
        titleP.setAttribute('style', 'color: var(--color-grey-70);margin-top: 1rem;font-weight: 400;line-height: var(--line-height-12);text-transform: uppercase;font-size: var(--font-size-12);')
        countryNameP.textContent = guessCountryName
        countryNameP.setAttribute('style', 'text-rendering: optimizeLegibility;font-family: Roboto Slab,serif;font-weight: 700;letter-spacing: .3px;line-height: var(--line-height-20);text-transform: uppercase;font-size: var(--font-size-20);')

        return resultIndicator
    }
    #addressBadGuess(guessCode: string, guessCountryName: string, targetCode: string, targetCountryName: string, containerSection: Element, streakCount: number, mapId: string): void {
        this.#messageBroker.sendMessage('getCodeBounds', [targetCode, guessCode]).then(([goodBounds, badBounds]) => {
            this.#innerBroker.sendExternalMessage('streaksBadResult', {boundary: badBounds, expectedBoundary: goodBounds})
        })
        containerSection.querySelector('.guess').textContent = `Wrong guess. Your streak ended at ${streakCount}.`
        const flagContainer = document.createElement('div')

        flagContainer.appendChild(this.#flagImage(guessCode, guessCountryName, 'Your guess'))
        flagContainer.appendChild(this.#flagImage(targetCode, targetCountryName, 'Correct answer'))
        flagContainer.setAttribute('style', 'display: flex;justify-content: space-evenly; width:40%; margin:auto;')
        containerSection.insertBefore(flagContainer, containerSection.firstChild)

        const viewSummaryButton = containerSection.querySelector('[data-qa="close-round-result"]')
        viewSummaryButton.setAttribute('style', 'margin:0 1rem;')
        const newButton = viewSummaryButton.cloneNode(true) as Element
        newButton.removeAttribute('data-qa')
        newButton.querySelector('span').textContent = 'PLAY MAP AGAIN'
        newButton.addEventListener('click', () => {
            window.location.assign(`https://www.geoguessr.com/maps/${mapId}`)
        })
        viewSummaryButton.querySelector('span').textContent = 'GUESS IS ACTUALLY CORRECT'
        viewSummaryButton.insertAdjacentElement('beforebegin', newButton)
    }
}
