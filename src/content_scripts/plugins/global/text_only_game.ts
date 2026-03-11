import { Game, GameState, IGameApi } from 'api/game'
import {Terminal} from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import Countries from 'i18n-iso-countries'
import LocaleData from '../../../../node_modules/i18n-iso-countries/langs/en.json'

import { Broker } from './text_mode_plugin'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

enum State {
    GUESSING,
    GUESSED_CORRECT,
    GUESSED_WRONG,
}

export default class TextOnlyGame {
    terminal: Terminal
    api: IGameApi
    gameId: string
    game: Game
    zoom: number
    heading: number
    pitch: number
    panoId: string
    streakSize: number
    state = State.GUESSING
    broker: Broker
    innerBroker: ChromeContentToInjectedBroker
    constructor(terminalDiv: HTMLDivElement, api: IGameApi, gameId: string, broker: Broker, innerBroker: ChromeContentToInjectedBroker) {
        this.terminal = new Terminal({ cursorBlink: true, cursorStyle: 'block', convertEol: true, rendererType: 'dom', })
        this.terminal.open(terminalDiv)
        
        this.api = api
        this.gameId = gameId
        this.broker = broker
        this.innerBroker = innerBroker

        this.#disableKeyboardShortcuts()

        Countries.registerLocale(LocaleData)
        this.#setupTerminal()
        this.#initGameInfo()
    }
    
    #disableKeyboardShortcuts(): void {
        this.innerBroker.sendExternalMessage('freezeShortcuts', null)
    }

    async #initGameInfo(): Promise<void>{
        this.api.getGameData(this.gameId).then(gameData => {
            this.game = gameData
            this.terminal.writeln('')
            this.terminal.writeln('')
            this.terminal.writeln('Known issue: typing F may accidentally trigger fullscreen mode :(')
            this.terminal.writeln('It should stop doing that after the first time.')
            this.terminal.writeln('Type \'help\' to find out available commands.')
            this.#prompt()
            this.terminal.focus()
            const round = gameData.rounds[gameData.roundCount - 1]
            this.heading = round.heading
            this.pitch = round.pitch
            this.zoom = round.zoom
            if (round.zoom === undefined) {
                this.zoom = 0
            }
        })
    }

    #setupTerminal(): void {
        const fit = new FitAddon()
        this.terminal.loadAddon(fit)
        fit.fit()

        let cmd = ''
        this.terminal.onKey(({key, domEvent}) => {
            if(domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey) {
                return
            }
            if (domEvent.keyCode === 13) {
                this.terminal.write('\r\n')
                this.#run(cmd)
                cmd = ''
            } else if (domEvent.keyCode === 8) {
                if (cmd.length === 0) {
                    return
                }
                // Move cursor back, write space over last character, move cursor again
                this.terminal.write('\b \b')
                cmd = cmd.slice(0, cmd.length - 1)
            } else {
                cmd += key
                this.terminal.write(key)
            }
        })
    }

    #zoomCmd(argv: string[]): void {
        if (argv.length == 1) {
            this.terminal.writeln('Zoom in or out?!')
        } else {
            switch(argv[1].toLocaleLowerCase()) {
                case 'out': {
                    this.zoom = Math.max(0, this.zoom - 1)
                    break
                }
                case 'in': {
                    this.zoom = Math.min(2, this.zoom + 1)
                    break
                }
                default: {
                    this.terminal.writeln('You can only zoom in or out.')
                    this.#prompt()
                    return
                }
            }
            this.innerBroker.sendExternalMessage('updatePov', {heading: this.heading, pitch: this.pitch, zoom: this.zoom})
            this.#prompt()
        }
        this.#prompt()
    }

    #run(cmd: string): void {
        const stripped = cmd.trim()
        const argv = stripped.split(' ')
        const cmdName = argv[0].toLocaleLowerCase()
        if (cmdName === 'stats') {
            this.#stats()
            return
        }
        switch(this.state) {
            case State.GUESSING: {
                if (stripped === '') {
                    this.#prompt()
                    return
                }
                switch(cmdName) {
                    case 'guess': {
                        this.#guess(argv.slice(1).join(' '))
                        break
                    }
                    case 'clear': {
                        this.terminal.clear()
                        this.#prompt()
                        break
                    }
                    case 'creep': {
                        this.#creep(argv)
                        break
                    }
                    case 'zoom': {
                        this.#zoomCmd(argv)
                        break
                    }
                    case 'help': {
                        this.#help()
                        break
                    }
                    default: {
                        this.terminal.writeln('Unkown command! For a list of available commands, type help')
                        this.#prompt()
                    }
                }
                break
            }
            case State.GUESSED_CORRECT: {
                switch(cmdName) {
                    case 'next': {
                        window.location.reload()
                        break
                    }
                    default: {
                        this.terminal.writeln('Unsupported command! Just type next or stats')
                    }
                }
                break
            }
            case State.GUESSED_WRONG: {
                switch(cmdName) {
                    case 'menu': {
                        window.location.assign('https://www.geoguessr.com/')
                        break
                    }
                    case 'newgame': {
                        window.location.assign('https://www.geoguessr.com/#16bit')
                        break
                    }
                    default: {
                        this.terminal.writeln('Unsupported command! Just type \'menu\', \'newgame\' or \'stats\'')
                    }
                }
            }
        }
    }

    #compass(): void {
        if (this.heading >= (360 - 22.5) || this.heading < 22.5) {
            this.terminal.writeln('Currently pointing NORTH.')
        } else if (this.heading >= 22.5 && this.heading < (45 + 22.5)) {
            this.terminal.writeln('Currently pointing NORTH-EAST.')
        } else if (this.heading >= (45 + 22.5) && this.heading < (90 + 22.5)) {
            this.terminal.writeln('Currently pointing EAST.')
        } else if (this.heading >= (90 + 22.5) && this.heading < (90 + 45 + 22.5)) {
            this.terminal.writeln('Currently pointing SOUTH-EAST.')
        } else if (this.heading >= (180 - 22.5) && this.heading < (180 + 22.5)) {
            this.terminal.writeln('Currently pointing SOUTH.')
        } else if (this.heading >= (180 + 22.5) && this.heading < (180 + 45 + 22.5)) {
            this.terminal.writeln('Currently pointing SOUTH-WEST.')
        } else if (this.heading >= (270 - 22.5) && this.heading < (270 + 22.5)) {
            this.terminal.writeln('Currently pointing WEST.')
        } else {// if (this.heading >= (270 + 22.5) && this.heading < (270 + 45 + 22.5)) {
            this.terminal.writeln('Currently pointing NORTH-WEST.')
        }
    }

    #stats(): void {
        const numRounds = this.game.roundCount - (this.state === State.GUESSED_CORRECT ? 0 : 1)
        this.terminal.writeln(`You've correctly guessed ${numRounds} countries`)
        const counts = new Map<string, number>()
        for (let i = 0; i < numRounds; ++i) {
            const countryCode = this.game.rounds[i].streakLocationCode
            if (!counts.has(countryCode)) {
                counts.set(countryCode, 1)
            } else {
                counts.set(countryCode, counts.get(countryCode) + 1)
            }
        }
        for (const [countryCode, times] of counts) {
            this.terminal.writeln(`${Countries.getName(countryCode, 'en')} -> ${times} time${times> 1 ? 's' : ''}`)
        }
        this.#prompt()
    }

    #help(): void {
        this.terminal.write('\r\n')
        this.terminal.writeln('This is the awesome text-based game mode!')
        this.terminal.writeln('Here is a list of commands you can use:')
        this.terminal.writeln('')
        this.terminal.writeln('help              Display this awesome help message.')
        this.terminal.writeln('guess             type "guess" and the name of the country you think you\'re in.')
        this.terminal.writeln('                  So much faster than looking for it on the map.')
        this.terminal.writeln('creep up          Creep a bit up.')
        this.terminal.writeln('creep down        Creep a bit down.')
        this.terminal.writeln('creep left        Creep a bit left.')
        this.terminal.writeln('creep right       Creep a bit right.')
        this.terminal.writeln('zoom in           Zoom in a bit.')
        this.terminal.writeln('zoom out          Zoom out a bit.')
        this.terminal.writeln('clear             Clear the text console.')
        this.#prompt()
    }
    #prompt(): void {
        if (this.state === State.GUESSING) {
            this.#compass()
        }
        this.terminal.write(' >')
    }
    #creep(argv: string[]): void {
        if (argv.length == 1) {
            this.terminal.writeln('Choose a direction!')
            this.#prompt()
        } else {
            const deltaAngle = 10
            switch(argv[1].toLocaleLowerCase()) {
                case 'up': {
                    this.pitch = Math.min(this.pitch + deltaAngle, 90)
                    break
                }
                case 'down': {
                    this.pitch = Math.max(this.pitch - deltaAngle, -90)
                    break
                }
                case 'left': {
                    this.heading -= deltaAngle
                    if (this.heading < 0) {
                        this.heading += 360
                    }
                    break
                }
                case 'right': {
                    this.heading += deltaAngle
                    if (this.heading > 360) {
                        this.heading -= 360
                    }
                    break
                }
                default: {
                    this.terminal.writeln('Invalid direction! Creep up, down, left or right.')
                    this.#prompt()
                    return
                }
            }
            this.innerBroker.sendExternalMessage('updatePov', {heading: this.heading, pitch: this.pitch, zoom: this.zoom})
            this.#prompt()
        }
    }
    async #guess(countryName: string): Promise<void> {
        if (!countryName) {
            this.terminal.writeln('Please specify the country!')
            this.#prompt()
            return
        }
        const country = Countries.getAlpha2Code(countryName.toLocaleLowerCase(), 'en')
        if (!country) {
            this.terminal.writeln(`Unknown country ${countryName}, try again`)
            this.terminal.writeln('')
            this.#prompt()
        } else {
            const game = await this.api.guessCountry(country.toLocaleLowerCase(), this.gameId, false)
            if (game.state === GameState.FINISHED) {
                this.state = State.GUESSED_WRONG
                const correct = game.rounds[game.roundCount - 1].streakLocationCode
                this.terminal.writeln('Wrong guess :(')
                this.terminal.writeln(`You guessed ${Countries.getName(country, 'en')}, but it was ${Countries.getName(correct, 'en')}`)
                this.terminal.writeln(`Your streak ended at ${game.roundCount - 1}.`)
                this.terminal.writeln('Type \'menu\' to go back to menu or \'newgame\' to play a new game.')
            } else {
                this.state = State.GUESSED_CORRECT
                this.terminal.writeln('Correct! Type \'next\' to proceed to next round.')
                this.terminal.writeln(`Your current streak is at ${game.roundCount - 1} countries.`)
            }
            this.#prompt()
        }
    }
}