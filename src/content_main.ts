/**
 * Entry point for the GeoGuessr website content script.
 * This script is executed prior to anything else being loaded on the webpage.
 * The website is a SPA, which means the content script could be run as little
 * as one time per tab.
 */
import 'reflect-metadata'
import ContentAndBackgroundMessageBroker, { createStorageAndBroker } from 'messaging/content_to_background_broker'
import AbyssLogger from 'logging/abyss_logger'
import axios, { AxiosInstance } from 'axios'
import EndpointTransitionHandler from 'content/endpoint_transition_handler'
import { MaterialHandler } from 'postprocessing/frontend/material_handler'
import injectReloadAlert from 'debugging/auto_reload'
import { Container } from 'inversify'
import config from 'inversify.config'
import { ChromeStorage } from 'storage/chrome_storage'
import { ILogger } from 'logging/logging'
import addStaticCssRules from 'postprocessing/frontend/static_css_rules'
import injectAllScripts from 'injected_scripts/inject_script'
import { DefaultApiProvider, IApiProvider } from 'api/api_provider'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
import DebugLogger from 'logging/debug_logger'
import DebugHandler from 'debugging/debug_handler'
import CSSEffectMaterialHandler from 'postprocessing/frontend/css_effect_material_handler'
declare const DEBUGGING: boolean

// Scripts that are injected directly into the DOM.
injectAllScripts()

console.time('createStorageAndBroker')
const [storage, messageBroker] = await createStorageAndBroker()
console.timeEnd('createStorageAndBroker')

// Debug only
injectReloadAlert(messageBroker)
addStaticCssRules(storage)

const container = new Container({ skipBaseClassChecks: true })

// Bind axios clients to the two endpoints
container.bind<AxiosInstance>(config.Client).toConstantValue(axios.create({ baseURL: 'https://www.geoguessr.com' }))
container.bind<AxiosInstance>(config.GameServerClient).toConstantValue(axios.create({ baseURL: 'https://game-server.geoguessr.com' }))

// Bind all APIs
container.bind<IApiProvider>(config.ApiProvider).to(DefaultApiProvider)

// Bind storage and message broker
container.bind<ChromeStorage>(config.ChromeStorage).toConstantValue(storage)
container.bind<ContentAndBackgroundMessageBroker>(config.ContentAndBackgroundMessageBroker).toConstantValue(messageBroker)
container.bind<ChromeContentToInjectedBroker>(config.ChromeContentToInjectedBroker).to(ChromeContentToInjectedBroker).inSingletonScope()

if (DEBUGGING) {
    container.bind<DebugHandler>(config.DebugHandler).to(DebugHandler).inSingletonScope()
    container.bind<ILogger>(config.BaseLogger).to(DebugLogger).inSingletonScope()
} else {
    container.bind<ILogger>(config.BaseLogger).to(AbyssLogger)
}

container.bind<CSSEffectMaterialHandler>(CSSEffectMaterialHandler).toSelf()
container.bind<MaterialHandler>(MaterialHandler).toSelf()
container.bind<EndpointTransitionHandler>(EndpointTransitionHandler).toSelf()

container.get(MaterialHandler)
container.get(EndpointTransitionHandler)

messageBroker.createListener('reloadPage', '', () => {
    window.location.reload()
})