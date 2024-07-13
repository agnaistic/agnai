import { Component, createEffect, createSignal, on, onMount } from 'solid-js'
import { TTSService } from '/common/types'
import Select, { Option } from '/web/shared/Select'
import { voiceStore } from '/web/store/voice'
import { isAgnaisticSpeechAllowed } from '/web/shared/Audio/speech'

export const VoiceServiceSelect: Component<{
  value: TTSService | undefined
  onChange: (service: TTSService) => void
}> = (props) => {
  const services = voiceStore((s) => s.services)
  const [options, setOptions] = createSignal<Option<TTSService | ''>[]>([])

  onMount(() => {
    voiceStore.getServices()
  })

  // Update services list
  createEffect(
    on(
      () => services,
      (services) => {
        const canUseAgnai = isAgnaisticSpeechAllowed()

        const values: Option<TTSService | ''>[] = [{ value: '', label: 'None' }]

        if (canUseAgnai) {
          values.push({ label: 'Agnaistic', value: 'agnaistic' })
        }

        for (const svc of services) {
          values.push({ label: svc.label, value: svc.type })
        }
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
        fieldName="ttsService"
        items={options()}
        value={props.value}
        label="Voice Service"
        onChange={(ev) => props.onChange((ev.value as TTSService) || '' || undefined)}
      ></Select>
    </>
  )
}
