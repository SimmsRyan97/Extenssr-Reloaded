import Alert from '@mui/material/Alert'
import React, { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import ReactDOM from 'react-dom/client'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
declare const DEBUGGING: boolean
const ALERT_ID = 'alert-id'

function CustomAlert(props: {broker: ContentAndBackgroundMessageBroker}) {
    const [showAlert, setShowAlert] = useState(false)
    useEffect(() => {
        const handle = props.broker.createListener('emitDone', '', () => {
            setShowAlert(true)
        })
        return () => handle.deregister()
    }, [])
    return <span id={ALERT_ID}>
        {showAlert && <Alert severity="warning" action={
            <Button size="small" onClick={async () => {
                try {
                    await props.broker.sendMessage('reloadExtension', null)
                } catch(e) {
                    // 
                }
                window.location.reload()
            }
            }>
                Reload page
            </Button>
        }>Extension source code updated, page needs reloading</Alert>}
    </span>
}
function createContainerIfNeeded(): HTMLElement {
    const ID = 'alerts-container'
    const existingElement = document.getElementById(ID)
    if (existingElement) {
        return existingElement
    }
    const newElement = document.createElement('div')
    newElement.setAttribute('id', ID)
    newElement.setAttribute('style', 'position: fixed; z-index: 1000;width: 100%;')
    document.body.insertBefore(newElement, document.body.firstElementChild)
    return newElement
}

export default function injectReloadAlert(broker: ContentAndBackgroundMessageBroker): void {
    if (!DEBUGGING) {
        return
    }
    document.addEventListener('DOMContentLoaded', () => {
        // This should probably create root only once, but it's debug only so who cares.
        ReactDOM.createRoot(createContainerIfNeeded())
            .render(<CustomAlert broker={broker}/>)
    })
}
