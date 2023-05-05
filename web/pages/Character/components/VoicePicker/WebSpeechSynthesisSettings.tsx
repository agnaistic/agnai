import { Component } from 'solid-js'
import { CharacterVoiceWebSpeechSynthesisSettings } from '../../../../../srv/db/texttospeech-schema'

export type CharacterVoiceWebSpeechSynthesisSettingsSpecific = Omit<
  CharacterVoiceWebSpeechSynthesisSettings,
  'backend' | 'voiceId'
>
export const defaultWebSpeechSynthesisSettings: CharacterVoiceWebSpeechSynthesisSettingsSpecific =
  {}

export const WebSpeechSynthesisSettings: Component<{
  settings: CharacterVoiceWebSpeechSynthesisSettingsSpecific
  onChange: (value: CharacterVoiceWebSpeechSynthesisSettingsSpecific) => void
}> = (props) => {
  const update = (diff: Partial<CharacterVoiceWebSpeechSynthesisSettingsSpecific>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  return <></>
}
