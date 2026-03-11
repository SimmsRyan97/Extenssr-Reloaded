import EndpointScript from 'content/endpoints/content_script'
import { AbyssTag, ILogger } from 'logging/logging'
import ResultsRoutePlugin from 'content/plugins/results/results_route_plugin'
import ResultsMapsLinksPlugin from 'content/plugins/results/results_maps_links_plugin'
import { Container, inject, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'

/**
 * Handles everything that happens under /results/<result_id>
 */

@injectable()
export class ResultsInfoProvider {
    resultsId = ''
}

@injectable()
export default class ResultsScript extends EndpointScript {
    #resultsInfoProvider: ResultsInfoProvider
    observer: MutationObserver | null = null

    constructor(
        @inject(config.BaseLogger) logger: ILogger,
    ) {
        super(logger, AbyssTag.RESULTS_SCRIPT)
    }

    bindPlugins(bindFunc: interfaces.Bind): void {
        bindFunc<ResultsRoutePlugin>(config.ResultsRoutePlugin).to(ResultsRoutePlugin)
        bindFunc<ResultsMapsLinksPlugin>(config.ResultsMapsLinksPlugin).to(ResultsMapsLinksPlugin)
    }

    bindHelpers(bindFunc: interfaces.Bind): void {
        bindFunc<ResultsInfoProvider>(config.ResultsInfoProvider).to(ResultsInfoProvider).inSingletonScope
    }


    protected initImpl(path: string, container: Container): void {
        this.#resultsInfoProvider = container.get<ResultsInfoProvider>(config.ResultsInfoProvider)
        this.#resultsInfoProvider.resultsId = path.split('/')[2]

        this.addPlugin(container.get<ResultsRoutePlugin>(config.ResultsRoutePlugin))
        this.addPlugin(container.get<ResultsMapsLinksPlugin>(config.ResultsMapsLinksPlugin))
    }

    matches(path: string): boolean {
        return path.startsWith('/results/')
    }
}
