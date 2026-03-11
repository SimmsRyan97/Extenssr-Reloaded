import eventHijackInject from 'injected_scripts/event_hijack'
import canvasInject from 'injected_scripts/canvas'
import websocketInject from 'injected_scripts/websocket'
import { addMapListeners, MapNotifier } from 'injected_scripts/maps'
import streetviewOverrider, { addStreetviewListeners, StreetviewNotifier } from 'injected_scripts/street_view'
import { ChromeInjectedToContentBroker } from 'messaging/content_to_injected_broker'
import GoogleNotifier from 'injected_scripts/maps_api_injecter'
import mapsOverrider from 'injected_scripts/maps'

const broker = new ChromeInjectedToContentBroker()
const map_notifier = new MapNotifier()
const streetview_notifier = new StreetviewNotifier()
const google_notifier = new GoogleNotifier()
google_notifier.addOverrider(mapsOverrider(map_notifier))
google_notifier.addOverrider(streetviewOverrider(streetview_notifier))
addMapListeners(broker, map_notifier)
addStreetviewListeners(broker, streetview_notifier)
google_notifier.startObserving()

canvasInject(broker)
websocketInject(broker)
eventHijackInject(broker)



