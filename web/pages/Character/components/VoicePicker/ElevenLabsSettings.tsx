import { Component, createEffect, createSignal, on, onMount } from 'solid-js'
import { ElevenLabsModel, VoiceSettingForm } from '/common/types/texttospeech-schema'
import RangeInput from '../../../../shared/RangeInput'
import Select, { Option } from '../../../../shared/Select'
import { voiceStore } from '/web/store/voice'

export const defaultElevenLabsSettings: VoiceSettingForm<'elevenlabs'> = {
  stability: 0.75,
  similarityBoost: 0.75,
}

export const ElevenLabsSettings: Component<{
  settings: VoiceSettingForm<'elevenlabs'>
  onChange: (value: VoiceSettingForm<'elevenlabs'>) => void
}> = (props) => {
  const update = (diff: Partial<VoiceSettingForm<'elevenlabs'>>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  const state = voiceStore((s) => ({ list: s.models }))

  const [modelOptions, setModelOptions] = createSignal<Option[]>([])

  onMount(() => {
    voiceStore.getVoiceModels('elevenlabs')
  })

  createEffect(
    on(
      () => state.list.elevenlabs,
      (list) => {
        let options: Option[]
        if (!list || !list.length) {
          options = [{ value: '', label: 'Models loading...' }]
        } else {
          options = list.map((m) => ({ value: m.id, label: m.label }))
        }
        if (!props.settings.model && options?.length) {
          update({ model: options[0].value as ElevenLabsModel })
        }
        setModelOptions(options)
      }
    )
  )

  return (
    <>
      <Select
        fieldName="elevenLabsModel"
        label="ElevenLabs Model"
        items={modelOptions()}
        value={props.settings.model}
        onChange={(item) => update({ model: item.value as ElevenLabsModel })}
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

      <RangeInput
        fieldName="elevenLabsRate"
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
