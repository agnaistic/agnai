import Select from '../../../shared/Select'
import { userStore } from '../../../store'
import { Component, createSignal } from 'solid-js'
import ElevenLabsSettings from './ElevenLabsSettings'
import { Toggle } from '../../../shared/Toggle'
import Divider from '../../../shared/Divider'

const voiceTypes = [
  { label: 'None', value: '' },
  { label: 'ElevenLabs', value: 'elevenlabs' },
]

export const VoiceSettings: Component = () => {
  const state = userStore()

  const [currentType, setType] = createSignal(state.user?.voice?.type)
  const subclass = 'flex flex-col gap-4'

  return (
    <div class="flex flex-col gap-4">
      <Select
        fieldName="voiceType"
        items={voiceTypes}
        value={state.user?.voice?.type || ''}
        onChange={(value) => setType(value.value as any)}
      />

      <Toggle
        label="Filter actions"
        helperText="Skips text in asterisks and parenthesis."
        fieldName="voiceFilterActions"
        value={state.user?.voice?.filterActions ?? true}
      />

      <Divider />

      <div class={currentType() === 'elevenlabs' ? subclass : 'hidden'}>
        <ElevenLabsSettings />
      </div>
    </div>
  )
}
