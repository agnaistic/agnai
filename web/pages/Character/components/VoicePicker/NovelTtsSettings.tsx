import { Component } from 'solid-js'
import { VoiceSettingForm } from '../../../../../common/types/texttospeech-schema'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { RefreshCw } from 'lucide-solid'

export const NovelTtsSettings: Component<{
  settings: VoiceSettingForm<'novel'>
  onChange: (value: VoiceSettingForm<'novel'>) => void
}> = (props) => {
  const update = (diff: Partial<VoiceSettingForm<'novel'>>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  const generate = () => {
    update({ seed: generateRandomSeed(12) })
  }

  function generateRandomSeed(length: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'
    return [...Array(length)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  return (
    <>
      <div class="flex items-end">
        <TextInput
          fieldName="novelSeed"
          label="Seed"
          helperText="Allows you to create a custom voice using a seed of your choice. Overrides the voice."
          value={props.settings.seed ?? ''}
          onChange={(ev) => update({ seed: ev.currentTarget.value })}
        />
        <Button class="ml-2 rounded-lg" onClick={() => generate()}>
          <RefreshCw size={24} />
        </Button>
      </div>
    </>
  )
}
