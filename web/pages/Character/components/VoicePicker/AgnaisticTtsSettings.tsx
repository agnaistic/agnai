import { Component } from 'solid-js'
import { VoiceSettingForm } from '../../../../../common/types/texttospeech-schema'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { RefreshCw } from 'lucide-solid'
import RangeInput from '/web/shared/RangeInput'

export const AgnaisticTtsSettings: Component<{
  settings: VoiceSettingForm<'agnaistic'>
  onChange: (value: VoiceSettingForm<'agnaistic'>) => void
}> = (props) => {
  const update = (diff: Partial<VoiceSettingForm<'agnaistic'>>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  const generate = () => {
    update({ seed: generateRandomSeed(12) })
  }

  function generateRandomSeed(maxLength: number) {
    const seed = Math.trunc(Math.random() * (Math.pow(10, maxLength) / 10))
    return seed
  }

  return (
    <>
      <div class="flex items-end">
        <TextInput
          fieldName="agnaisticSeed"
          type="number"
          label="Seed"
          helperText="*Select 'Use Seed' in Voice* - Allows you to create a custom voice using a seed of your choice. "
          value={props.settings.seed ?? ''}
          onChange={(ev) => update({ seed: +ev.currentTarget.value })}
        />
        <Button class="ml-2 rounded-lg" onClick={() => generate()}>
          <RefreshCw size={24} />
        </Button>
      </div>

      <RangeInput
        fieldName="agnaisticRate"
        label="Playback Rate"
        helperText=""
        min={0.5}
        max={2}
        step={0.01}
        value={props.settings.rate ?? 1}
        onChange={(value) => update({ rate: value })}
      />
    </>
  )
}
