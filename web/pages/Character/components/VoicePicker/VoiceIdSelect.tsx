import { TTSService } from '../../../../../common/types/texttospeech-schema'
import { voiceStore } from '../../../../store/voice'
import { Component, createEffect, createSignal, on } from 'solid-js'
import Select, { Option } from '../../../../shared/Select'
import Button from '/web/shared/Button'
import { RefreshCcw } from 'lucide-solid'

export const VoiceIdSelect: Component<{
  service: TTSService
  value?: string
  onChange: (id: string) => void
}> = (props) => {
  const state = voiceStore((s) => ({ list: s.voices }))

  const [options, setOptions] = createSignal<Option[]>([])
  const [load, setLoad] = createSignal(false)

  const loadVoices = async () => {
    setLoad(true)
    await voiceStore.getVoices(props.service).catch(() => null)
    setLoad(false)
  }

  createEffect(() => {
    voiceStore.getVoices(props.service)
  })

  createEffect(
    on(
      () => state.list[props.service],
      (list) => {
        let voicesList: Option[]
        if (!list) {
          voicesList = [{ value: '', label: 'Voices loading...' }]
        } else {
          voicesList = list.map((v) => ({ value: v.id, label: v.label }))
        }
        if (!props.value && list?.length) {
          props.onChange(list[0].id)
        }
        setOptions(voicesList)
      }
    )
  )

  const onVoiceChanged = (ev: { value: string }) => {
    props.onChange(ev.value as string)
  }

  return (
    <>
      <div class="flex items-end gap-1">
        <Select
          fieldName="voiceId"
          items={options()}
          value={props.value}
          label="Voice"
          onChange={onVoiceChanged}
          disabled={load()}
        />
        <Button onClick={loadVoices}>
          <RefreshCcw />
        </Button>
      </div>
    </>
  )
}
