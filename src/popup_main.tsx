import 'reflect-metadata'
import { createStorageAndBroker } from 'messaging/content_to_background_broker'
import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './popup/popup'

const [storage, messageBroker] = await createStorageAndBroker()

ReactDOM.createRoot(document.getElementById('popup'))
    .render(<Popup messageBroker={messageBroker} storage={storage}/>)
window.addEventListener('close', () => {
    messageBroker.deregisterAll()
})
