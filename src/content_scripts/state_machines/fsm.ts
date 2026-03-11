import { StateChangeListener } from 'content/endpoints/content_script'

export interface IFSM<StateEnum> {
    addStateChangeListener(listener: StateChangeListener<StateEnum>): void
}

export class FSM<StateEnum, EventEnum> implements IFSM<StateEnum> {
    #listeners: StateChangeListener<StateEnum>[] = []
    #transitions: Map<EventEnum, Map<StateEnum, StateEnum>>
    #state: StateEnum
    #initialState: StateEnum
    nextId = 0
    protected constructor(startState: StateEnum, transitions: Map<EventEnum, Map<StateEnum, StateEnum>>) {
        this.#initialState = this.#state = startState
        this.#transitions = transitions
    }
    addStateChangeListener(listener: StateChangeListener<StateEnum>): void {
        this.#listeners.push(listener)
    }
    triggerEvent(event: EventEnum): void {
        if (!this.#transitions.has(event)) {
            return
        }
        const viableTransitions = this.#transitions.get(event)
        const oldState = this.#state
        if (!viableTransitions.has(oldState)) {
            return
        }
        this.#state = viableTransitions.get(oldState)
        this.#listeners.forEach(listener => listener.onStateChange(this.#state))
    }
    resetToStart(): void {
        this.#state = this.#initialState
        this.#listeners.forEach(listener => listener.onStateChange(this.#state))
    }
    getState(): StateEnum {
        return this.#state
    }
    static TransitionsBuilder = class TransitionsBuilder<StateEnum, EventEnum> {
        transitions: Map<EventEnum, Map<StateEnum, StateEnum>> = new Map()

        addTransition(from: StateEnum, by: EventEnum, to: StateEnum): TransitionsBuilder<StateEnum, EventEnum> {
            if (!this.transitions.has(by)) {
                this.transitions.set(by, new Map())
            }
            this.transitions.get(by).set(from, to)
            return this
        }
        build(): Map<EventEnum, Map<StateEnum, StateEnum>> {
            return this.transitions
        }
    }
}
