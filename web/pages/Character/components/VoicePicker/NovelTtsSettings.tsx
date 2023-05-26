import { Component } from 'solid-js'
import { VoiceSettingForm } from '../../../../../srv/db/texttospeech-schema'

export const NovelTtsSettings: Component<{
  settings: VoiceSettingForm<'novel'>
  onChange: (value: VoiceSettingForm<'novel'>) => void
}> = (_) => {
  return (
    <>
      <div>
        <i>No settings</i>
      </div>
    </>
  )
}
