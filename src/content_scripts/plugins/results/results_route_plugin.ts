import { AbyssTag, ILogger } from 'logging/logging'
import { ResultsInfoProvider } from 'content/endpoints/results_script'
import { EndpointPlugin } from 'content/endpoints/content_script'
import { Route } from 'route_saving/route'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

// Display routes driven on the game results map.

@injectable()
export default class ResultsRoutePlugin extends EndpointPlugin {
    #messageBroker: ContentAndBackgroundMessageBroker
    #innerBroker: ChromeContentToInjectedBroker
    #resultsInfoProvider: ResultsInfoProvider
    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker
    ) {
        super(logger, AbyssTag.RESULTS_ROUTE_PLUGIN)
        this.#messageBroker = broker
        this.#innerBroker = innerBroker
    }

    protected async initImpl(): Promise<void> {
        const broker = this.#messageBroker
        const { resultsId } = this.#resultsInfoProvider
        const route: Route = await broker.sendMessage('queryGameRoundRoute', {
            gameId: resultsId,
            roundId: 'all',
        })
        if (!route) {
            return
        }
        this.#innerBroker.sendExternalMessage('showRoutes', route)
    }
    protected deinitImpl(): void {
        this.#innerBroker.sendExternalMessage('clearRoutes', null)
    }
}
