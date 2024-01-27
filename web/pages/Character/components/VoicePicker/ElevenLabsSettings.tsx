import { Component, createEffect, createMemo, createSignal, on } from 'solid-js'
import { ElevenLabsModel, VoiceSettingForm } from '/common/types/texttospeech-schema'
import RangeInput from '../../../../shared/RangeInput'
import Select, { Option } from '../../../../shared/Select'
import { voiceStore } from '/web/store/voice'
import { useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'


export const defaultElevenLabsSettings: VoiceSettingForm<'elevenlabs'> = {
  stability: 0.75,
  similarityBoost: 0.75,
}

export const ElevenLabsSettings: Component<{
  settings: VoiceSettingForm<'elevenlabs'>
  onChange: (value: VoiceSettingForm<'elevenlabs'>) => void
}> = (props) => {
  const [t] = useTransContext()

  const update = (diff: Partial<VoiceSettingForm<'elevenlabs'>>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  const state = voiceStore((s) => ({ list: s.models }))

  const [modelOptions, setModelOptions] = createSignal<Option[]>([])

  createEffect(() => {
    voiceStore.getVoiceModels('elevenlabs')
  })

  const list = createMemo(() => state.list['elevenlabs'])

  createEffect(
    on(list, (list) => {
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
    })
  )

  return (
    <>
      <Select
        fieldName="elevenLabsModel"
        label={t('eleven_labs_model')}
        items={modelOptions(t)}
        value={props.settings.model}
        onChange={(item) => update({ model: item.value as ElevenLabsModel })}
      />

      <RangeInput
        fieldName="elevenLabsStability"
        label={t('stability')}
        helperText={t('stability_message')}
        value={props.settings.stability ?? 0.75}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => update({ stability: value })}
      />

      <RangeInput
        fieldName="elevenLabsSimilarityBoost"
        label={t('clarity_and_similarity_enhancement')}
        helperText={t('clarity_and_similarity_enhancement_message')}
        value={props.settings.similarityBoost ?? 0.75}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => update({ similarityBoost: value })}
      />

      <RangeInput
        fieldName="elevenLabsRate"
        label={t('playback_rate')}
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
