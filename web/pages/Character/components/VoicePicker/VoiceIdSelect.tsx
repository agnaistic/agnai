import { TTSService } from '../../../../../common/types/texttospeech-schema'
import { voiceStore } from '../../../../store/voice'
import { Component, createEffect, createMemo, createSignal, on } from 'solid-js'
import Select, { Option } from '../../../../shared/Select'

export const VoiceIdSelect: Component<{
  service: TTSService
  value?: string
  onChange: (id: string) => void
}> = (props) => {
  const state = voiceStore((s) => ({ list: s.voices }))

  const [options, setOptions] = createSignal<Option[]>([])

  createEffect(() => {
    voiceStore.getVoices(props.service)
  })

  const list = createMemo(() => state.list[props.service])

  createEffect(
    on(list, (list) => {
      let voicesList: Option[]
      if (!list || !list.length) {
        voicesList = [{ value: '', label: 'Voices loading...' }]
      } else {
        voicesList = list.map((v) => ({ value: v.id, label: v.label }))
      }
      if (!props.value && list?.length) {
        props.onChange(list[0].id)
      }
      setOptions(voicesList)
    })
  )

  const onVoiceChanged = (ev: { value: string }) => {
    props.onChange(ev.value as string)
  }

  return (
    <>
      <Select
        fieldName="voiceId"
        items={options()}
        value={props.value}
        label="Voice"
        onChange={onVoiceChanged}
      ></Select>
    </>
  )
}
