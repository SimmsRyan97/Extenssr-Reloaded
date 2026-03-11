import { SavedLocation, SourceType } from 'location_saving/location'
import React, { useEffect, useState } from 'react'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import Button from '@mui/material/Button'
import JSZip from 'jszip'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
const NO_LOCATIONS: SavedLocation[] = []
const NO_LOCATION_IDS: number[] = []
type SavedLocationsListProps = {
    broker: ContentAndBackgroundMessageBroker,
    innerBroker: ChromeContentToInjectedBroker
}

type ScreenshotImgProps = {
    locationId: number,
    broker: ContentAndBackgroundMessageBroker
}

type SavedLocationProps = {
    location: SavedLocation,
    broker: ContentAndBackgroundMessageBroker,
    selected: boolean,
    onSet: (val: boolean) => void
    onRemove: () => void
}

const convertImageData = (imageData: Uint8Array): Uint8Array => {
    return new Uint8Array(Array.from([...Array(Object.keys(imageData).length)].keys()).map(idx => imageData[idx]))
}

const loadImg = async (imgTag: HTMLImageElement, locationId: number, broker: ContentAndBackgroundMessageBroker) => {
    const screenshot = await broker.sendMessage('getScreenshotForLocationId', locationId)
    if (!screenshot) {
        const listener = broker.createListener('notifyScreenshotForLocationId', '', async (otherLocationId) => {
            if (otherLocationId === locationId) {
                listener.deregister()
                loadImg(imgTag, locationId, broker)
            }
        })
    } else {
        const data = convertImageData(screenshot.imageData)
        const url = URL.createObjectURL(new Blob([data]))
        const oldStyle = imgTag.getAttribute('style')
        imgTag.setAttribute('style', `${oldStyle};content: url(${url})`)
        imgTag.onload = () => URL.revokeObjectURL(url)
    }
}

const imgStyle: React.CSSProperties = {maxWidth:100, maxHeight:100, objectFit:'contain'}
const ScreenshotImg = ({locationId, broker}: ScreenshotImgProps) => (
    <img style={imgStyle} src={chrome.runtime.getURL('/icons/unavailable.png')} onLoad={(evt) => loadImg(evt.target as HTMLImageElement, locationId, broker)}/>
)

const resultHref = (location: SavedLocation) => location.type === SourceType.BR ? `https://geoguessr.com/battle-royale/${location.gameId}` : `https://geoguessr.com/results/${location.gameId}`
const locationName = (location: SavedLocation) => location.type == SourceType.BR ? 'Battle Royale' : location.mapName
const alignStyle = {verticalAlign:'middle', margin: 'auto 10px'}
const SavedLocationItem = ({location, broker, selected, onSet, onRemove}: SavedLocationProps) => (
    <div style={{display:'flex', alignContent:'center', marginTop: 10, backgroundColor: selected?'orange':'lightgrey'}} onClick={() => onSet(!selected)}>
        <ScreenshotImg key={`img${location.id}`} locationId={location.id} broker={broker}/>
        <span style={alignStyle}>
            <b>{locationName(location)}</b> round {location.roundId}
        </span>
        <Button  
            color='primary'
            variant='contained'
            style={{height:'90%', margin: 'auto 10px'}}
            onClick={(evt) => {
                evt.stopPropagation()
                window.open(resultHref(location), '_blank').focus()
            }}
        >
            Game results page
        </Button>
        <Button  
            color='primary'
            variant='contained'
            style={{height:'90%', margin: 'auto 10px'}}
            onClick={(evt) => {
                evt.stopPropagation()
                onRemove()
            }}
        >
            Remove location
        </Button>
    </div>
)

export default function SavedLocationsList({ broker, innerBroker }: SavedLocationsListProps): JSX.Element {
    const [savedLocations, setSavedLocations] = useState(NO_LOCATIONS)
    const [selected, setSelected] = useState(NO_LOCATION_IDS)
    const updateSavedLocations = async () => {
            const locations = await broker.sendMessage('getUnlockedLocations', null)
            setSavedLocations(locations)
    }
    useEffect(() => {
        updateSavedLocations()
        const listener = broker.createListener('notifyUpdateLocations', 'Notify when locations are updated', () => {
            updateSavedLocations()
        })
        return () => {
            listener.deregister()
        }
    }, [])
    return (
        <>
            <section className="grid__column">
                <h1>Saved locations</h1>
                <span>
                    <Button
                        color='primary'
                        variant='contained'
                        disabled={selected.length === 0}
                        onClick={() => {
                            const csvData = savedLocations.filter(location => selected.includes(location.id)).map(location => `${location.pos.lat},${location.pos.lng}`).join('\n')
                            const blob = new Blob([csvData], {type: 'text/csv'})
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'locations.csv'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >Export locations</Button>
                    <Button
                        style={{marginLeft:'1rem'}}
                        color='primary'
                        variant='contained'
                        disabled={selected.length === 0}
                        onClick={async () => {
                            const toDownload = selected.slice()
                            const zip = new JSZip()
                            await Promise.all(toDownload.map(async (locationId) => {
                                const screenshot = await broker.sendMessage('getScreenshotForLocationId', locationId)
                                if (screenshot) {
                                    zip.file(`${locationId}.jpeg`, convertImageData(screenshot.imageData))
                                }
                            }))
                           
                            const blob = await zip.generateAsync({type: 'blob'})
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'screenshots.zip'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >Export screenshots</Button>
                </span>
                {savedLocations.map(location => (
                    <SavedLocationItem
                        key={location.id}
                        location={location}
                        broker={broker}
                        selected={selected.includes(location.id)}
                        onSet={(v) => {
                            const newIds = v ? selected.concat(location.id) : selected.filter(x => x != location.id)
                            const newLocations = savedLocations.filter(location => newIds.includes(location.id))
                            innerBroker.sendExternalMessage('savedLocationsSelected', newLocations)
                            setSelected(newIds)}}
                        onRemove={async ()=> {
                            const newIds = selected.filter(x => x != location.id)
                            const newLocations = savedLocations.filter(x => x.id != location.id)
                            innerBroker.sendExternalMessage('savedLocationsSelected', newLocations)
                            await broker.sendMessage('deleteLocation', location)
                            setSelected(newIds)
                            setSavedLocations(newLocations)
                        }}
                    />)
                )}
            </section>
            {/* <section className="grid__column">
                <h1>Recent Battle Royale games</h1>
            </section> */}
        </>
    )
}
