
import { LocationSource } from 'location_saving/location'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'

export async function triggerSaveLocation(locationSource: LocationSource, broker: ContentAndBackgroundMessageBroker, innerBroker: ChromeContentToInjectedBroker): Promise<void> {
    const {pos, heading, pitch} = await innerBroker.sendExternalMessage('queryLocation', null)
    const locationId = await broker.sendMessage('addLocation', {locked: 1, pos, heading, pitch, ...locationSource})
    // TODO: this still doesn't work :(
    const screenshot = await innerBroker.sendExternalMessage('takeScreenshot', null)
    await broker.sendMessage('addScreenshot', {locationId, imageData: screenshot})
    broker.sendInternalMessage('triggerFlash', null)
}
