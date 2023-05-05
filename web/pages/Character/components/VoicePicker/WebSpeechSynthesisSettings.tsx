import { Component } from 'solid-js'
import { CharacterVoiceWebSpeechSynthesisSettings } from '../../../../../srv/db/texttospeech-schema'
import RangeInput from '../../../../shared/RangeInput'

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

  return (
    <>
      {' '}
      <RangeInput
        fieldName="webSpeechSynthesisStability"
        label="Pitch"
        helperText="The pitch at which the utterance will be spoken at."
        value={props.settings.pitch ?? 1}
        min={0}
        max={2}
        step={0.01}
        onChange={(value) => update({ pitch: value })}
      />
      <RangeInput
        fieldName="webSpeechSynthesisSimilarityBoost"
        label="Rate"
        helperText="The speed at which the utterance will be spoken at"
        value={props.settings.rate ?? 1}
        min={0.1}
        max={10}
        step={0.01}
        onChange={(value) => update({ rate: value })}
      />
    </>
  )
}
