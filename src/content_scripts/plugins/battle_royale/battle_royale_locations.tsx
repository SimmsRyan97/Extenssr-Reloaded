import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BattleRoyaleGameState, BattleRoyaleRound } from 'api/battle_royale'
import { AbyssTag, ILogger } from 'logging/logging'
import Button from '@mui/material/Button'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'

type LocationProps = {
    gameId: string
    messageBroker: ContentAndBackgroundMessageBroker
    logger: ILogger
}
function Locations(props: LocationProps): JSX.Element {
  const [showLocations, setShowLocations] = useState(false)
  const emptyRound: BattleRoyaleRound[] = []
  const [roundLocations, setRoundLocations] = useState(emptyRound)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    const listener = props.messageBroker.createListener('brUpdateLocations', 'Update BR locations', (brData: BattleRoyaleGameState) => {
      if (brData.gameId === props.gameId) {
        const rounds = brData.rounds.slice()
        if (!brData.hasGameEnded) {
          rounds.pop()
        }
        setRoundLocations(rounds)
      }
    })
    props.messageBroker.sendInternalMessage('requestBrLocations', null)

    return () => listener.deregister()
  }, [])
  const roundElement = (roundData: BattleRoyaleRound, idx: number) => {
    return (
      <div style={{ margin: 10, padding: 10 }} key={idx}>
        <div style={{ backgroundColor: 'lightgray', borderRadius: 2 }}>
          <img
            width={26}
            height={26}
            src={`/static/flags/${roundData.answer.countryCode.toUpperCase()}.svg`}
            style={{ display: 'inline-block', margin: 10, verticalAlign: 'middle' }}
          />
          <a
            style={{ display: 'inline-block', margin: 10 }}
            href={`http://maps.google.com/maps?q=&layer=c&cbll=${roundData.lat},${roundData.lng}`}
            target="blank"
          >
            Round {roundData.roundNumber}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Button
        style={{
          zIndex: 1,
          opacity: showLocations || hover ? 1.0 : 0.3,
          marginLeft: '1.25rem',
          marginTop: '.5rem',
        }}
        onClick={() => {
          setShowLocations(!showLocations)
        }}
        variant="contained"
        color="primary"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {(showLocations ? 'Hide' : 'Show') + ' locations from finished rounds'}
      </Button>

      <div style={{ zIndex: 1000, position: 'absolute', display: showLocations ? 'block' : 'none' }}>
        {roundLocations
          .filter((location) => location.answer && location.answer.countryCode)
          .map(roundElement)}
      </div>
    </div>
  )
}

let prevGameId = null
let root: ReactDOM.Root | null = null
let rootDiv: HTMLElement | null = null
let styleNode: HTMLStyleElement | null = null

function removeOnlyLocationsDiv(): void {
    if (rootDiv) {
        rootDiv.remove()
        rootDiv = null
        root.unmount()
    }
}
export function removeLocationsDiv(): void {
    removeOnlyLocationsDiv()
    if (styleNode) {
        styleNode.remove()
        styleNode = null
    }
}

export function injectLocations(gameId: string, messageBroker: ContentAndBackgroundMessageBroker, logger: ILogger): void {
    if (rootDiv && document.body.contains(rootDiv) && prevGameId === gameId) {
        return
    }
    const localLogger = logger.withTag(AbyssTag.BATTLE_ROYALE_LOCATIONS)
    localLogger.log('injectLocations')
    removeOnlyLocationsDiv()
    prevGameId = gameId
    rootDiv = document.createElement('rootDiv')
    rootDiv.id = 'brlocations'
    const parent = document.querySelector('main')
    parent.insertBefore(rootDiv, parent.firstChild)
    if (!styleNode) {
        styleNode = document.createElement('style')
        styleNode.setAttribute('id', 'brlocationsstyle')
        styleNode.textContent = `.br-hud__power-up-container > div:first-child {
            margin-top: 1.75rem;
        }`
        document.head.appendChild(styleNode)
    }
    root = ReactDOM.createRoot(rootDiv)
    root.render(<Locations gameId={gameId} messageBroker={messageBroker} logger={localLogger} />)
}