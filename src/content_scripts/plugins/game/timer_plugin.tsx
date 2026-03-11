import React from 'react'
import ReactDOM from 'react-dom/client'
import formatDuration from 'format-duration'
import { EndpointPlugin, StateChangeListener } from 'content/endpoints/content_script'
import { GameInfoProvider } from 'content/endpoints/game_script'
import { GameFSM, GameScriptState } from 'content/state_machines/game'
import { AbyssTag, ILogger } from 'logging/logging'
import { RoundTiming } from 'timer/timer'
import { inject, injectable } from 'inversify'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import config from '../../../inversify.config'

type StatusElementProps = {
    title: string,
    children: React.ReactNode,
}

function StatusElement({ title, children }: StatusElementProps) {
    return (
        <div className="extenssr__timer-element">
            <div className="extenssr__timer-element__heading">{title}</div>
            <div className="extenssr__timer-element__body">{children}</div>
        </div>
    )
}

function formatTime(round: RoundTiming | undefined, time: number) {
    if (!round || !round.startTime) {
        return '--:--'
    }

    const endTime = round.endTime ?? time
    return formatDuration(endTime - round.startTime)
}

function sumRoundTimes(rounds: RoundTiming[], currentTime: number) {
    return rounds.reduce((acc, round) => {
        if (!round) return acc
        if (!round.endTime) return acc + currentTime - round.startTime
        return acc + round.endTime - round.startTime
    }, 0)
}

type TimerBarProps = {
    rounds: RoundTiming[],
    currentTime: number,
}

function TimerBar({ rounds, currentTime }: TimerBarProps) {
    const round1 = formatTime(rounds[0], currentTime)
    const round2 = formatTime(rounds[1], currentTime)
    const round3 = formatTime(rounds[2], currentTime)
    const round4 = formatTime(rounds[3], currentTime)
    const round5 = formatTime(rounds[4], currentTime)

    // Not including time between rounds for now
    const allRounds = formatDuration(sumRoundTimes(rounds, currentTime))

    // Using "Rx" for the titles instead of "Round x" to reduce the horizontal size.
    // This bar covers the street view panorama so it should be as small as possible.
    return (
        <div className="extenssr__timer-bar">
            <StatusElement title="R1">{round1}</StatusElement>
            <StatusElement title="R2">{round2}</StatusElement>
            <StatusElement title="R3">{round3}</StatusElement>
            <StatusElement title="R4">{round4}</StatusElement>
            <StatusElement title="R5">{round5}</StatusElement>
            <StatusElement title="Total">{allRounds}</StatusElement>
        </div>
    )
}

@injectable()
export default class TimerPlugin extends EndpointPlugin implements StateChangeListener<GameScriptState> {
    #timer: ReturnType<typeof requestAnimationFrame> | null = null
    // Copy of the current timings for the timer bar.
    #rounds: RoundTiming[] = []
    #container: HTMLDivElement | null = null
    #containerRoot: ReactDOM.Root | null = null
    #messageBroker: ContentAndBackgroundMessageBroker
    #gameInfoProvider: GameInfoProvider
    constructor(
        @inject(config.GameInfoProvider) gameInfoProvider: GameInfoProvider,
        @inject(config.BaseLogger) baseLogger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) messageBroker: ContentAndBackgroundMessageBroker,
        @inject(GameFSM) fsm: GameFSM
    ) {
        super(baseLogger, AbyssTag.TIMER_PLUGIN)
        this.#messageBroker = messageBroker
        this.#gameInfoProvider = gameInfoProvider
        fsm.addStateChangeListener(this)
    }

    async onStateChange(state: GameScriptState): Promise<void> {
        const { gameId } = this.#gameInfoProvider
        const roundId = this.#gameInfoProvider.getRoundNumber()

        if (state === GameScriptState.GUESS) {
            await this.#startRound(gameId, roundId)
        } else if (this.#timer !== null) {
            // Timer is running but we are no longer in the guess screen,
            // this probably means the round ended.
            await this.#endRound(gameId, roundId)
        }

        // Instead of trying to modify the state in the `rounds` array
        // to match the database, we can just refetch everything from there.
        //
        // We do this *here*, because the database is updated above, and then
        // used below this line.
        this.#rounds = await this.#messageBroker.sendMessage('getTimingsForGame', gameId)

        if (state === GameScriptState.ROUND_RESULT) {
            this.#renderPostRoundSummary()
        }
    }

    protected deinitImpl(): void {
        if (this.#timer !== null) {
            cancelAnimationFrame(this.#timer)
            this.#timer = null
        }
        if (this.#container) {
            this.#container.remove()
            this.#container = null
        }
        if (this.#containerRoot) {
            this.#containerRoot.unmount()
            this.#containerRoot = null
        }
    }

    #insertInGameContainer(): void {
        const statusContainer = document.querySelector('.game-layout__status, [data-qa="game-layout-status"]') as HTMLDivElement
        if (!statusContainer) {
            this.logger.log('Timer status container not found, using floating fallback')
        }

        const existingScope = statusContainer ?? document.body
        const existing = existingScope.querySelector('.extenssr__game-timings') as HTMLDivElement | null
        if (existing) {
            const existingContent = existing.querySelector('.extenssr__game-timings__content') as HTMLDivElement | null
            if (existingContent) {
                this.#container = existingContent
                if (this.#containerRoot) {
                    this.#containerRoot.unmount()
                }
                this.#containerRoot = ReactDOM.createRoot(existingContent)
                return
            }
        }

        const timingsBar = document.createElement('div')
        timingsBar.classList.add('extenssr__game-timings')
        if (!statusContainer) {
            timingsBar.classList.add('extenssr__game-timings--floating')
        }
        const content = document.createElement('div')
        content.classList.add('extenssr__game-timings__content')
        timingsBar.append(content)
        if (statusContainer) {
            statusContainer.append(timingsBar)
        } else {
            const root = document.body || document.documentElement
            root.append(timingsBar)
        }

        this.#container = content
        if (this.#containerRoot) {
            this.#containerRoot.unmount()
        }
        this.#containerRoot = ReactDOM.createRoot(content)
        this.logger.log('Inserted in-game container')
    }

    async #startRound(gameId: string, roundId: number): Promise<void> {
        const roundStartTime = Date.now()

        // GeoGuessr now keeps the game layout mounted while showing the round end screen,
        // so we should only inject the timings element if it's not already there
        if (!this.#container || !document.body.contains(this.#container)) {
            this.#insertInGameContainer()
        }

        await this.#messageBroker.sendMessage('startRoundTiming', [gameId, roundId, roundStartTime])

        this.#renderTimerBar(roundStartTime)
        const render = () => {
            const currentTime = Date.now()
            this.#renderTimerBar(currentTime)
            this.#timer = requestAnimationFrame(render)
        }
        this.#timer = requestAnimationFrame(render)

        if (roundId > 0) {
            const lastRound = await this.#messageBroker.sendMessage('getRoundTiming',[gameId, roundId])
            // if it's `undefined`, something went very wrong, but we still don't want to crash
            if (lastRound) {
                await this.#messageBroker.sendMessage('setWaitDuration', [lastRound, roundStartTime - lastRound.endTime])
            }
        }
    }

    async #endRound(gameId: string, roundId: number): Promise<void> {
        const roundEndTime = Date.now()

        cancelAnimationFrame(this.#timer)
        this.#timer = null

        const round = await this.#messageBroker.sendMessage('endRoundTiming',[gameId, roundId, roundEndTime])
        if (round && roundId === 4) {
            // finished the game, there is no post-game wait.
            // TODO(reanna): should check if it's not a streak game
            await this.#messageBroker.sendMessage('setWaitDuration', [round, 0])
        }
    }

    #renderTimerBar(time: number): void {
        if (!this.#containerRoot) {
            return
        }
        this.#containerRoot.render((
                <TimerBar rounds={this.#rounds} currentTime={time} />
            ))
    }

    #renderResultTimings(target: Element): void {
        // if we have a consistent state right now, `currentTime` should not be used.
        // i'm putting in NaN so it shows up when something weird happened and hopefully someone reports it.
        ReactDOM.createRoot(target)
            .render((
                <TimerBar rounds={this.#rounds} currentTime={NaN} />
            ))
    }

    #renderPostRoundSummary(): void {
        const target = document.createElement('div')
        target.classList.add('extenssr__result-timings')

        const reference = document.querySelector('[data-qa="guess-description"], .result-layout_guessDescription__N5h8N') as HTMLDivElement
        if (!reference) {
            this.logger.log('Timer result reference not found')
            return
        }
        reference.insertAdjacentElement('afterend', target)

        this.#renderResultTimings(target)
    }
}
