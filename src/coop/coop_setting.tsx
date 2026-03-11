import React from 'react'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Switch from '@mui/material/Switch'

function CoopSetting({ defaultValue, onChange }: { defaultValue: boolean, onChange: (value: boolean) => void }): JSX.Element {
    return (
        <FormControl>
            <FormControlLabel
                control={(
                    <Switch
                        color="primary"
                        defaultChecked={defaultValue}
                        onChange={(_, value) => onChange(value)}
                    />
                )}
                label="Coop game"
            />
            <FormHelperText>
                In coop games, you play in pairs, with one player driving in street view and one player looking at the map.
                You have to communicate to find where you are.
                {' '}<a target="_blank" rel="noreferrer" href="https://gitlab.com/nonreviad/extenssr/-/wikis/Coop">more »</a>
            </FormHelperText>
        </FormControl>
    )
}

export default CoopSetting
