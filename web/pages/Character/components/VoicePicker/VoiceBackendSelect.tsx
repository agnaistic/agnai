import { Component, createEffect, createSignal, on, onMount } from 'solid-js'
import { TextToSpeechBackend } from '../../../../../srv/db/texttospeech-schema'
import { voiceStore } from '../../../../store/voice'
import Select, { Option } from '../../../../shared/Select'

export const VoiceBackendSelect: Component<{
  value: TextToSpeechBackend | undefined
  onChange: (backend: TextToSpeechBackend) => void
}> = (props) => {
  const backends = voiceStore((s) => s.backends)
  const [options, setOptions] = createSignal<Option<TextToSpeechBackend | ''>[]>([])

  onMount(() => {
    voiceStore.getBackends()
  })

  // Update backends list
  createEffect(
    on(
      () => backends,
      (backends) => {
        const values: Option<TextToSpeechBackend | ''>[] = [
          { value: '', label: 'None' },
          ...backends.map((backend) => ({ label: backend.label, value: backend.type })),
        ]
        const current = props.value
        if (current && !values.find((v) => v.value === current)) {
          values.push({ value: current, label: current })
        }
        setOptions(values)
      }
    )
  )

  return (
    <>
      <Select
        fieldName="ttsBackend"
        items={options()}
        value={props.value}
        label="Voice Backend"
        onChange={(ev) => props.onChange((ev.value as TextToSpeechBackend) || '' || undefined)}
      ></Select>
    </>
  )
}
