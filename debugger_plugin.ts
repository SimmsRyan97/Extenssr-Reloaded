import WebSocket from 'ws'
import {config as DotenvConfigLoad} from 'dotenv'
import {Compiler, Stats} from 'webpack'
DotenvConfigLoad()

const port = parseInt(process.env.DEBUG_PORT || '8888')

const MAX_TIMEOUT = 30000 // ms
const MIN_TIMEOUT = 1000  // ms
export default class DebuggerPlugin {
    ws: WebSocket | null
    currTimeout = MIN_TIMEOUT

    constructor() {
        this.#connect()
    }
    #reconnect() {
        setTimeout (() => {
            this.currTimeout *= 1.5
            this.currTimeout = Math.min(this.currTimeout, MAX_TIMEOUT)
            this.#connect()
        }, this.currTimeout)
    }
    #connect() {
        this.ws = new WebSocket(`ws://127.0.0.1:${port}`)
        this.ws.addEventListener('open', () => {
            this.currTimeout = MIN_TIMEOUT
        })
        this.ws.addEventListener('error', () => {
            this.ws.close()
        })
        this.ws.addEventListener('close', () => {
            this.ws = null
            this.#reconnect()
        })
    }
    apply(compiler: Compiler): void {
        compiler.hooks.afterDone.tap('Debugger plugin', (_stats) => {
            this.notifyDebugger(_stats)
        })
    }
    notifyDebugger(_stats: Stats): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws?.send(JSON.stringify({emitDone: ''}))
        }
    }
}
