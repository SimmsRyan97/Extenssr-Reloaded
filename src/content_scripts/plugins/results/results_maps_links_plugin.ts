import { AbyssTag, ILogger } from 'logging/logging'
import { ResultsInfoProvider } from 'content/endpoints/results_script'
import { EndpointPlugin } from 'content/endpoints/content_script'
import Score from 'api/score'
import GameApi from 'api/game'
import { inject, injectable } from 'inversify'
import config from '../../../inversify.config'

/**
 * Update the markers on the map to include NMPZ orientation.
 */

@injectable()
export default class ResultsMapsLinksPlugin extends EndpointPlugin {
    #results: Score[]
    #api: GameApi
    #resultsInfoProvider: ResultsInfoProvider
    constructor(
        @inject(config.BaseLogger) logger: ILogger,
        @inject(GameApi) api: GameApi,
        @inject(config.ResultsInfoProvider) resultsInfoProvider: ResultsInfoProvider
    ) {
        super(logger, AbyssTag.RESULTS_ROUTE_PLUGIN)
        this.#api = api
        this.#resultsInfoProvider = resultsInfoProvider
    }

    #onClick = (event: Event): void => {
        if (!(event.target instanceof HTMLElement)) {
            return
        }
        const marker = event.target.closest('[data-qa="correct-location-marker"]')
        if (!marker) {
            return
        }
        const roundNumber = Number(marker.textContent)
        if (Number.isNaN(roundNumber)) {
            return
        }

        const round = this.#results?.[0]?.game.rounds[roundNumber - 1]
        if (round) {
            event.preventDefault()
            event.stopPropagation()

            const url = new URL('https://www.google.com/maps/@?api=1&map_action=pano')
            url.searchParams.set('viewpoint', `${round.lat},${round.lng}`)
            if (round.panoId) {
                url.searchParams.set('pano', round.panoId)
            }
            url.searchParams.set('heading', String(round.heading))
            url.searchParams.set('pitch', String(round.pitch))

            window.open(url, '_blank')
        }
    }

    protected async initImpl(): Promise<void> {
        const { resultsId } = this.#resultsInfoProvider

        // would prefer to delay doing this until one of the pins is actually clicked,
        // but our `window.open` call will get blocked if there was async work in the
        // click handler.
        this.#results = await this.#api.getHighScores(resultsId, 0, 26)

        const map = document.querySelector('[data-qa="results-map"]')
        map.addEventListener('click', this.#onClick, { capture: true })
    }

    protected deinitImpl(): void {
        const map = document.querySelector('[data-qa="results-map"]')
        map?.removeEventListener('click', this.#onClick)
    }
}
