import { Component } from 'solid-js'
import {
  CharacterVoiceElevenLabsSettings,
  ElevenLabsModels,
} from '../../../../../srv/db/texttospeech-schema'
import RangeInput from '../../../../shared/RangeInput'
import Select, { Option } from '../../../../shared/Select'

export type CharacterVoiceElevenLabsSettingsSpecific = Omit<
  CharacterVoiceElevenLabsSettings,
  'backend' | 'voiceId'
>

const modelOptions: Option<ElevenLabsModels>[] = [
  {
    value: 'eleven_monolingual_v1',
    label: 'Eleven Monolingual v1',
  },
  {
    value: 'eleven_multilingual_v1',
    label: 'Eleven Multilingual v1 (Experimental)',
  },
]

export const defaultElevenLabsSettings: CharacterVoiceElevenLabsSettingsSpecific = {
  model: 'eleven_monolingual_v1',
  stability: 0.75,
  similarityBoost: 0.75,
}

export const ElevenLabsSettings: Component<{
  settings: CharacterVoiceElevenLabsSettingsSpecific
  onChange: (value: CharacterVoiceElevenLabsSettingsSpecific) => void
}> = (props) => {
  const update = (diff: Partial<CharacterVoiceElevenLabsSettingsSpecific>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  return (
    <>
      <Select
        fieldName="elevenLabsModel"
        label="ElevenLabs Model"
        items={modelOptions}
        value={props.settings.model}
        onChange={(item) => update({ model: item.value as ElevenLabsModels })}
      />

      <RangeInput
        fieldName="elevenLabsStability"
        label="Stability"
        helperText="Increasing variability can make speech more expressive with output varying between re-generations. It can also lead to instabilities."
        value={props.settings.stability ?? 0.75}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => update({ stability: value })}
      />

      <RangeInput
        fieldName="elevenLabsSimilarityBoost"
        label="Clarity + Similarity Enhancement"
        helperText="Low values are recommended if background artifacts are present in generated speech."
        value={props.settings.similarityBoost ?? 0.75}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => update({ similarityBoost: value })}
      />
    </>
  )
}
