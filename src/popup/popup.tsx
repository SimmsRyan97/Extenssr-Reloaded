import React, { useCallback, useState, useEffect } from 'react'
import Container from '@mui/material/Container'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import Switch from '@mui/material/Switch'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { SettingsKeys } from 'storage/storage'
import { ChromeStorage } from 'storage/chrome_storage'
import CasinoIcon from '@mui/icons-material/Casino'

type TabPanelProps = {
  children: React.ReactNode,
  value: number,
  index: number
} & React.ComponentPropsWithoutRef<'div'>

function TabPanel(props: TabPanelProps): JSX.Element {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`nav-tabpanel-${index}`}
      aria-labelledby={`nav-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography component={'span'}>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

export type PopupProps = {
  messageBroker: ContentAndBackgroundMessageBroker
  storage: ChromeStorage
}

function useSetting<S extends keyof SettingsKeys>(storage: ChromeStorage, name: S): [SettingsKeys[S], (newValue: SettingsKeys[S]) => void] {
  const [value, setValue] = useState(storage.getCachedValue(name))
  useEffect(() => {
    const listener = storage.createListener(name, setValue)
    return () => listener.deregister()
  }, [storage, name])

  const update = useCallback((newValue: SettingsKeys[S]) => {
    // This should be redundant, but I don't wanna tempt fate.
    setValue(newValue)
    storage.setValue(name, newValue)
  }, [storage, name])

  return [value, update]
}
export type SettingToggleProp<Key extends keyof SettingsKeys> = {
  storageKey: Key,
  storage: ChromeStorage,
  label: string,
  tooltip?: string,
  disabled?: boolean
}

function GridToggleSetting<Key extends keyof SettingsKeys>({ storage, storageKey, label, tooltip, disabled = false }: SettingToggleProp<Key>) {
  const [val, setVal] = useSetting(storage, storageKey)
  const content = <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      px: 1,
      py: 0.5,
      backgroundColor: 'background.paper',
      minHeight: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
    }}
  >
    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>{label}</Typography>
    <Switch
      color="primary"
      checked={val as boolean}
      disabled={disabled}
      onChange={(evt) => setVal(evt.target.checked as SettingsKeys[Key])}
      size="small"
    />
  </Box>
  if (!tooltip) {
    return content
  }
  return <Tooltip title={tooltip} arrow enterDelay={300}>{content}</Tooltip>
}

type TabProps = { storage: ChromeStorage, broker: ContentAndBackgroundMessageBroker, value: number, index: number }
type BlinkMode = SettingsKeys['blinkMode']

const effectTips: Record<string, string> = {
  grayscale: 'Desaturates the panorama.',
  invert: 'Inverts all street-view colours.',
  sepia: 'Applies a warm vintage tone.',
  mirror: 'Flips the street view horizontally.',
  fisheye: 'Curves the image with a wide-lens effect.',
  chromaticAberration: 'Adds RGB edge splitting like a CRT.',
  sobel: 'Highlights object edges only.',
  drunk: 'Distorts the view dynamically.',
  vignette: 'Darkens edges to focus center.',
  water: 'Wavy refraction effect.',
  bloom: 'Glowing highlights on bright regions.',
  min: 'Posterized minimum filter style.',
  motionBlur: 'Adds blur trails while panning.',
  scramble: 'Scrambles view segments each round.',
  hideCompass: 'Hides the in-game compass.',
  showCar: 'Shows the default GeoGuessr car when enabled.',
  snowing: 'Adds falling snow overlay.',
  aiOverlay: 'AI mask to hide car areas. Heavier performance cost.',
  randomizer: 'Automatically randomizes challenge effects for each new round.',
  focusRing: 'Darkens the screen except a center shape to constrain view.',
  challengeSeed: 'Makes randomizer outputs deterministic so others can use the same sequence.',
}

function CameraEffectsTab({ storage, value, index, broker }: TabProps) {
  const [pixelate, setPixelate] = useSetting(storage, 'pixelateMap')
  const [pixelateScaling, setPixelateScaling] = useSetting(storage, 'pixelateScale')
  const [toon, setToon] = useSetting(storage, 'toon')
  const [toonScale, setToonScale] = useSetting(storage, 'toonScale')
  const [blinkEnabled, setBlinkEnabled] = useSetting(storage, 'blinkEnabled')
  const [blinkMode, setBlinkMode] = useSetting(storage, 'blinkMode')
  const [blinkTimeSeconds, setBlinkTimeSeconds] = useSetting(storage, 'blinkTimeSeconds')
  const [blinkDecreaseStepSeconds, setBlinkDecreaseStepSeconds] = useSetting(storage, 'blinkDecreaseStepSeconds')
  const [blinkMinTimeSeconds, setBlinkMinTimeSeconds] = useSetting(storage, 'blinkMinTimeSeconds')
  const [blinkRandomMaxSeconds, setBlinkRandomMaxSeconds] = useSetting(storage, 'blinkRandomMaxSeconds')
  const [blinkRoundDelaySeconds, setBlinkRoundDelaySeconds] = useSetting(storage, 'blinkRoundDelaySeconds')
  const [focusRingEnabled, setFocusRingEnabled] = useSetting(storage, 'focusRingEnabled')
  const [focusRingSize, setFocusRingSize] = useSetting(storage, 'focusRingSize')
  const [focusRingShape, setFocusRingShape] = useSetting(storage, 'focusRingShape')
  const [challengeSeedEnabled] = useSetting(storage, 'challengeSeedEnabled')
  const [challengeSeed] = useSetting(storage, 'challengeSeed')
  const seedLocked = challengeSeedEnabled && challengeSeed.trim().length > 0
  const selectedBlinkMode = blinkMode as BlinkMode

  const setMode = (mode: BlinkMode): void => {
    setBlinkMode(mode)
  }

  return <TabPanel value={value} index={index}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <FormControlLabel
          label="Blink mode"
          control={
            <Switch
              color="primary"
              checked={blinkEnabled}
              disabled={seedLocked}
              onChange={(evt) => setBlinkEnabled(evt.target.checked)}
            />
          }
          sx={{ width: '100%', m: 0, justifyContent: 'space-between' }}
        />
        <Typography variant="caption" color="text.secondary">
          Show panorama briefly each round, then black it out.
        </Typography>
        {blinkEnabled && <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Round timing mode</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Button disabled={seedLocked} size="small" variant={selectedBlinkMode === 'fixed' ? 'contained' : 'outlined'} onClick={() => setMode('fixed')}>Fixed</Button>
            <Button disabled={seedLocked} size="small" variant={selectedBlinkMode === 'decrease' ? 'contained' : 'outlined'} onClick={() => setMode('decrease')}>Decrease each round</Button>
            <Button disabled={seedLocked} size="small" variant={selectedBlinkMode === 'random' ? 'contained' : 'outlined'} onClick={() => setMode('random')}>Random</Button>
          </Box>

          {selectedBlinkMode === 'fixed' && <>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Visible time: {blinkTimeSeconds.toFixed(1)}s</Typography>
            <Slider
              value={blinkTimeSeconds}
              disabled={seedLocked}
              min={0.1}
              max={10.0}
              step={0.1}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => setBlinkTimeSeconds(newValue as number)}
            />
          </>}

          {selectedBlinkMode === 'decrease' && <>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Start time: {blinkTimeSeconds.toFixed(1)}s</Typography>
            <Slider
              value={blinkTimeSeconds}
              disabled={seedLocked}
              min={0.1}
              max={10.0}
              step={0.1}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => setBlinkTimeSeconds(newValue as number)}
            />
            <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}>Decrease step per round: {blinkDecreaseStepSeconds.toFixed(1)}s</Typography>
            <Slider
              value={blinkDecreaseStepSeconds}
              disabled={seedLocked}
              min={0.1}
              max={5.0}
              step={0.1}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => setBlinkDecreaseStepSeconds(newValue as number)}
            />
            <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}>Minimum time: {blinkMinTimeSeconds.toFixed(1)}s</Typography>
            <Slider
              value={blinkMinTimeSeconds}
              disabled={seedLocked}
              min={0.1}
              max={Math.max(0.1, blinkTimeSeconds)}
              step={0.1}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => setBlinkMinTimeSeconds(newValue as number)}
            />
          </>}

          {selectedBlinkMode === 'random' && <>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Random max time: {blinkRandomMaxSeconds.toFixed(1)}s</Typography>
            <Slider
              value={blinkRandomMaxSeconds}
              disabled={seedLocked}
              min={0.1}
              max={8.0}
              step={0.1}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => setBlinkRandomMaxSeconds(newValue as number)}
            />
            <Typography variant="caption" color="text.secondary">Each round picks a random visible time from 0.1s to the selected max.</Typography>
          </>}

          <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}>Round delay: {blinkRoundDelaySeconds.toFixed(1)}s</Typography>
          <Slider
            value={blinkRoundDelaySeconds}
            disabled={seedLocked}
            min={0.0}
            max={5.0}
            step={0.1}
            valueLabelDisplay="auto"
            onChange={(_, newValue) => setBlinkRoundDelaySeconds(newValue as number)}
          />
        </Box>}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <FormControlLabel
          label="Focus Ring"
          control={
            <Switch
              color="primary"
              checked={focusRingEnabled}
              disabled={seedLocked}
              onChange={(evt) => setFocusRingEnabled(evt.target.checked)}
            />
          }
          sx={{ width: '100%', m: 0, justifyContent: 'space-between' }}
        />
        <Typography variant="caption" color="text.secondary">{effectTips.focusRing}</Typography>

        {focusRingEnabled && <>
          <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}>Size: {focusRingSize}%</Typography>
          <Slider
            value={focusRingSize}
            disabled={seedLocked}
            min={10}
            max={95}
            step={1}
            valueLabelDisplay="auto"
            onChange={(_, newValue) => setFocusRingSize(newValue as number)}
          />

          <TextField
            select
            fullWidth
            size="small"
            label="Shape"
            sx={{ mt: 1 }}
            value={focusRingShape}
            disabled={seedLocked}
            onChange={(evt) => setFocusRingShape(evt.target.value as SettingsKeys['focusRingShape'])}
          >
            <MenuItem value="circle">Circle</MenuItem>
            <MenuItem value="square">Square</MenuItem>
            <MenuItem value="triangle">Triangle</MenuItem>
            <MenuItem value="star">Star</MenuItem>
          </TextField>
        </>}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <FormControlLabel
          label="Pixelate"
          control={
            <Switch
              color="primary"
              checked={pixelate}
              disabled={seedLocked}
              onChange={(evt) => {
                setPixelate(evt.target.checked)
              }}
            />
          }
          sx={{ width: '100%', m: 0, justifyContent: 'space-between' }}
        />
        {pixelate && <>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Strength: {pixelateScaling.toFixed(1)}</Typography>
          <Slider
            value={pixelateScaling}
            disabled={seedLocked}
            min={4.0}
            max={300.0}
            valueLabelDisplay="auto"
            onChange={(_, newValue) => setPixelateScaling(newValue as number)}
          />
        </>}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <FormControlLabel
          label="Toon"
          control={
            <Switch
              color="primary"
              checked={toon}
              disabled={seedLocked}
              onChange={(evt) => {
                setToon(evt.target.checked)
              }}
            />
          }
          sx={{ width: '100%', m: 0, justifyContent: 'space-between' }}
        />
        {toon && <>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Strength: {toonScale.toFixed(1)}</Typography>
          <Slider
            value={toonScale}
            disabled={seedLocked}
            min={2.0}
            max={20.0}
            step={0.1}
            valueLabelDisplay="auto"
            onChange={(_, newValue) => setToonScale(newValue as number)}
          />
        </>}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        <GridToggleSetting label={'Grayscale'} storageKey={'grayscale'} storage={storage} tooltip={effectTips.grayscale} disabled={seedLocked} />
        <GridToggleSetting label={'Invert colours'} storageKey={'invert'} storage={storage} tooltip={effectTips.invert} disabled={seedLocked} />
        <GridToggleSetting label={'Sepia effect'} storageKey={'sepia'} storage={storage} tooltip={effectTips.sepia} disabled={seedLocked} />
        <GridToggleSetting label={'Mirror'} storageKey={'mirror'} storage={storage} tooltip={effectTips.mirror} disabled={seedLocked} />
        <GridToggleSetting label={'Fish eye lens'} storageKey={'fisheye'} storage={storage} tooltip={effectTips.fisheye} disabled={seedLocked} />
        <GridToggleSetting label={'CRT TV filter'} storageKey={'chromaticAberration'} storage={storage} tooltip={effectTips.chromaticAberration} disabled={seedLocked} />
        <GridToggleSetting label={'Edge filter'} storageKey={'sobel'} storage={storage} tooltip={effectTips.sobel} disabled={seedLocked} />
        <GridToggleSetting label={'Drunk mode'} storageKey={'drunk'} storage={storage} tooltip={effectTips.drunk} disabled={seedLocked} />
        <GridToggleSetting label={'Vignette'} storageKey={'vignette'} storage={storage} tooltip={effectTips.vignette} disabled={seedLocked} />
        <GridToggleSetting label={'Water effect'} storageKey={'water'} storage={storage} tooltip={effectTips.water} disabled={seedLocked} />
        <GridToggleSetting label={'Bloom'} storageKey={'bloom'} storage={storage} tooltip={effectTips.bloom} disabled={seedLocked} />
        <GridToggleSetting label={'Min filter'} storageKey={'min'} storage={storage} tooltip={effectTips.min} disabled={seedLocked} />
        <GridToggleSetting label={'Motion Blur'} storageKey={'motionBlur'} storage={storage} tooltip={effectTips.motionBlur} disabled={seedLocked} />
        <GridToggleSetting label={'Screen scrambler'} storageKey={'scramble'} storage={storage} tooltip={effectTips.scramble} disabled={seedLocked} />
        <GridToggleSetting label={'Hide Compass'} storageKey={'hideCompass'} storage={storage} tooltip={effectTips.hideCompass} disabled={seedLocked} />
        <GridToggleSetting label={'Show Car'} storageKey={'showCar'} storage={storage} tooltip={effectTips.showCar} disabled={seedLocked} />
      </Box>

      <IconButton
        disabled={seedLocked}
        onClick={ () => { broker.sendExternalMessage('randomize', null)}}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          justifyContent: 'center',
          gap: 1,
          py: 1,
        }}
      >
        <CasinoIcon />
        I am feeling lucky
      </IconButton>
    </Box>
  </TabPanel>
}

function SpecialEffectsTab({ storage, value, index, broker }: TabProps) {
  const [challengeSeedEnabled, setChallengeSeedEnabled] = useSetting(storage, 'challengeSeedEnabled')
  const [challengeSeed, setChallengeSeed] = useSetting(storage, 'challengeSeed')
  const seedLocked = challengeSeedEnabled && challengeSeed.trim().length > 0

  const updateSeed = (seed: string): void => {
    setChallengeSeed(seed)
  }

  const generateSeed = (): void => {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    const randomPart = Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 10)
    const timestampPart = Date.now().toString(36)
    updateSeed(`extenssr-${timestampPart}-${randomPart}`)
  }

  const startSeedMode = (): void => {
    if (!challengeSeed.trim()) {
      return
    }
    setChallengeSeedEnabled(true)
    broker.sendExternalMessage('randomize', null)
  }

  const stopSeedMode = (): void => {
    setChallengeSeedEnabled(false)
  }

  return <TabPanel value={value} index={index}>
    <Container maxWidth="lg" style={{ maxHeight: 'lg', padding: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Visual extras that can be heavier on performance.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        <GridToggleSetting label={'Snow on streetview'} storageKey={'snowing'} storage={storage} tooltip={effectTips.snowing} disabled={seedLocked} />
        <GridToggleSetting label={'Hide all cars (AI)'} storageKey={'aiOverlay'} storage={storage} tooltip={effectTips.aiOverlay} disabled={seedLocked} />
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mt: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Challenge seed</Typography>
        <Typography variant="caption" color="text.secondary">{effectTips.challengeSeed}</Typography>

        <TextField
          fullWidth
          size="small"
          label="Seed"
          sx={{ mt: 1 }}
          value={challengeSeed}
          disabled={seedLocked}
          onChange={(evt) => updateSeed(evt.target.value)}
          placeholder="extenssr-weekly-1"
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          Progression resets automatically when you leave gameplay routes.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" disabled={seedLocked} onClick={generateSeed}>Generate seed</Button>
          <Button variant="contained" size="small" disabled={seedLocked || !challengeSeed.trim()} onClick={startSeedMode}>Start seed generator</Button>
          <Button variant="contained" size="small" color="secondary" disabled={!seedLocked} onClick={stopSeedMode}>Stop seed generator</Button>
        </Box>
      </Box>
    </Container>
  </TabPanel>
}
function OtherTab({ storage, value, index }: TabProps) {
  const [debuggable, setDebuggable] = useSetting(storage, 'debuggable')
  return <TabPanel value={value} index={index}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        <GridToggleSetting label={'Accessibility mode'} storageKey={'enableAccessibilityMode'} storage={storage} tooltip={'Adjusts UI placement for easier readability.'} />
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            px: 1,
            py: 0.5,
            backgroundColor: 'background.paper',
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.2 }}>Debugging</Typography>
          <Switch
            color="primary"
            checked={debuggable}
            onChange={(evt) => setDebuggable(evt.target.checked)}
            size="small"
          />
        </Box>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Debug actions</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!debuggable}
            onClick={() => {
              storage.getValueCb('logs', logs => {
                storage.getValueCb('events', events => {
                  const a = document.createElement('a')
                  const items = { logs: logs, events: events }
                  const file = new Blob([JSON.stringify(items)], { type: 'application/json' })
                  a.href = URL.createObjectURL(file)
                  a.download = 'bugreport.json'
                  a.click()
                  URL.revokeObjectURL(a.href)
                })
              })
            }}
          >
            Download full bug report
          </Button>
          <Button
            disabled={!debuggable}
            variant="outlined"
            color="primary"
            onClick={() => {
              storage.setValue('events', [])
              storage.setValue('logs', [])
            }}
          >
            Clear debugging data
          </Button>
        </Box>
      </Box>
    </Box>
  </TabPanel>
}

function ResetTab({ value, index }: { value: number, index: number }) {
  return <TabPanel value={value} index={index}>
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Selecting this tab prompts to reset all extension settings to defaults.
      </Typography>
    </Box>
  </TabPanel>
}

function Popup({ storage, messageBroker }: PopupProps): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(0)
  const resetAllSettings = async (): Promise<void> => {
    const ok = window.confirm('Reset all Extenssr settings to defaults?')
    if (!ok) {
      return
    }
    await storage.clearAll()
    window.location.reload()
  }
  const onTabChange = async (_: unknown, value: number): Promise<void> => {
    if (value !== 3) {
      setSelectedTab(value)
      return
    }
    await resetAllSettings()
    setSelectedTab(selectedTab)
  }
  let tabIdx = 0
  return (
    <Container maxWidth="lg" style={{ maxHeight: 'lg', padding: 0 }}>
      <AppBar color='primary' position="static">
        <Tabs
          textColor='inherit'
          indicatorColor='secondary'
          value={selectedTab}
          onChange={onTabChange}
          variant="fullWidth"
          sx={{ minHeight: 40 }}
        >
          <Tab label="Camera" color='primary' sx={{ minHeight: 40, minWidth: 0, px: 0.25, fontSize: '0.72rem', letterSpacing: 0.2 }} />
          <Tab label="Special" color='primary' sx={{ minHeight: 40, minWidth: 0, px: 0.25, fontSize: '0.72rem', letterSpacing: 0.2 }} />
          <Tab label="Other" color='primary' sx={{ minHeight: 40, minWidth: 0, px: 0.25, fontSize: '0.72rem', letterSpacing: 0.2 }} />
          <Tab label="Reset" color='primary' sx={{ minHeight: 40, minWidth: 0, px: 0.25, fontSize: '0.72rem', letterSpacing: 0.2 }} />
        </Tabs>
      </AppBar>
      <CameraEffectsTab value={selectedTab} broker={messageBroker} index={tabIdx++} storage={storage} />
      <SpecialEffectsTab value={selectedTab} broker={messageBroker} index={tabIdx++} storage={storage} />
      <OtherTab value={selectedTab} broker={messageBroker} index={tabIdx++} storage={storage} />
      <ResetTab value={selectedTab} index={tabIdx++} />
    </Container>
  )
}
export default Popup
