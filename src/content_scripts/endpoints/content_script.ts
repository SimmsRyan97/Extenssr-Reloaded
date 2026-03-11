/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
import { Container, ContainerModule, interfaces } from 'inversify'
import { AbyssTag, ILogger } from 'logging/logging'

export interface IEndpointScript {
    init(path: string, container: Container): void
    onNewPath(path: string): void
    matches(path: string): boolean
    deinit(container: Container): void
}

interface IEndpointPlugin {
    init(): void
    deinit(): void
}

export interface StateChangeListener<StateEnum> {
    onStateChange(toState: StateEnum): void
}

export default abstract class EndpointScript implements IEndpointScript {
    #endPointPlugins: IEndpointPlugin[] = []
    #containerModule: ContainerModule | null = null
    readonly logger: ILogger
    constructor(baseLogger: ILogger, abyssTag: AbyssTag) {
        this.logger = baseLogger.withTag(abyssTag)
    }

    #bindEndpointSpecificData(bindFunc: interfaces.Bind): void {
        this.bindHelpers(bindFunc)
        this.bindPlugins(bindFunc)
    }
    bindPlugins(_bindFunc: interfaces.Bind): void { }
    bindHelpers(_bindFunc: interfaces.Bind): void { }
    protected addPlugin(plugin: IEndpointPlugin): void {
        this.#endPointPlugins.push(plugin)
    }

    readonly init = (path: string, container: Container): void => {
        this.logger.log('Init')
        const containerModule = new ContainerModule((bindFunc) => this.#bindEndpointSpecificData(bindFunc))
        container.load(containerModule)
        this.#containerModule = containerModule
        this.initImpl(path, container)
        this.#endPointPlugins.forEach(plugin => plugin.init())
    }
    readonly deinit = (container: Container): void => {
        this.logger.log('Deinit')
        if (this.#containerModule) {
            container.unload(this.#containerModule)
        }
        this.deinitImpl()
        this.#endPointPlugins.forEach(plugin => plugin.deinit())
        this.#endPointPlugins = []
    }

    protected initImpl(_path: string, _container: Container): void { }
    protected deinitImpl(): void { }
    onNewPath(_path: string): void { }
    abstract matches(path: string): boolean
}

export abstract class EndpointPlugin implements IEndpointPlugin {
    readonly logger: ILogger
    constructor(baseLogger: ILogger, abyssTag: AbyssTag) {
        this.logger = baseLogger.withTag(abyssTag)
    }

    readonly init = (): void => {
        this.logger.log('Init')
        this.initImpl()
    }
    readonly deinit = (): void => {
        this.logger.log('Deinit')
        this.deinitImpl()
    }

    protected initImpl(): void { }
    protected deinitImpl(): void { }
}
