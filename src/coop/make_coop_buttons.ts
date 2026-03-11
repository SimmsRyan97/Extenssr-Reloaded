import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { CoopMode } from './coop'

export type CoopButtonLabels = {
    driving: string,
    mapping: string,
}

export default function makeCoopButtons(
    startButton: HTMLButtonElement,
    broker: ContentAndBackgroundMessageBroker,
    gameId: string,
    labels: CoopButtonLabels
): void {
    const drivingButton = document.createElement('button')
    const mappingButton = document.createElement('button')

    drivingButton.type = 'button'
    drivingButton.classList.add(...startButton.classList)
    drivingButton.textContent = labels.driving
    drivingButton.onclick = () => {
        drivingButton.disabled = true
        mappingButton.disabled = true
        broker.sendMessage('setCoopMode', { gameId, mode: CoopMode.Driving }).then(() => {
            startButton.click()
        })
    }

    mappingButton.type = 'button'
    mappingButton.classList.add(...startButton.classList)
    mappingButton.textContent = labels.mapping
    mappingButton.onclick = () => {
        drivingButton.disabled = true
        mappingButton.disabled = true
        broker.sendMessage('setCoopMode', { gameId, mode: CoopMode.Mapping }).then(() => {
            startButton.click()
        })
    }
    mappingButton.style.marginLeft = '12px'

    startButton.insertAdjacentElement('afterend', mappingButton)
    startButton.insertAdjacentElement('afterend', drivingButton)
    startButton.style.display = 'none'
}
