import { Component } from 'solid-js'
import { VoiceSettingForm } from '../../../../../srv/db/texttospeech-schema'

export const SileroApiServerSettings: Component<{
  settings: VoiceSettingForm<'silero-api-server'>
  onChange: (value: VoiceSettingForm<'silero-api-server'>) => void
}> = (_) => {
  return (
    <>
      <div>
        <i>No settings</i>
      </div>
    </>
  )
}
