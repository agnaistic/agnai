import { Component, Show, createEffect, createSignal, on } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Select, { Option } from '../../../shared/Select'
import { playVoicePreview, voiceStore } from '../../../store/voice'
import { FormLabel } from '../../../shared/FormLabel'
import Button from '../../../shared/Button'
import { Play } from 'lucide-solid'

/** The header shown at the beginning of a conversation. */
const VoicePicker: Component<{ edit: AppSchema.Character }> = (props) => {
  const voices = voiceStore()

  const [voiceBackend, setVoiceBackend] = createSignal<AppSchema.VoiceBackend | ''>('')
  const [voiceBackendsList, setVoiceBackendsList] = createSignal<
    Option<AppSchema.VoiceBackend | ''>[]
  >([])
  const [voicesList, setVoicesList] = createSignal<Option[]>([])
  const [voice, setVoice] = createSignal<string>('')
  const [voicePreview, setVoicePreview] = createSignal<string | undefined>()

  createEffect(() => {
    const values: Option<AppSchema.VoiceBackend | ''>[] = [
      { value: '', label: 'None' },
      ...voices.types.map((type) => ({ label: type.label, value: type.type })),
    ]
    const current = props.edit.voice?.voiceBackend || ''
    if (current && !values.find((v) => v.value === current)) {
      values.push({ value: current, label: current })
    }
    setVoiceBackendsList(values)
  })

  createEffect(() => {
    voiceStore.getVoices(voiceBackend())
  })

  createEffect(() => {
    const voicesMap = voices.voices
    const backend = voiceBackend()
    if (!backend) return
    const voiceDefs = voicesMap[backend]
    let voicesList: Option[]
    if (!voiceDefs) {
      voicesList = [{ value: '', label: 'Voices loading...' }]
    } else if (!voiceDefs) {
      voicesList = [{ value: '', label: 'No voices available' }]
    } else {
      voicesList = voiceDefs.map((v) => ({ value: v.id, label: v.label }))
    }
    const currentVoiceId = props.edit.voice?.voiceId || ''
    if (
      currentVoiceId &&
      backend === props.edit?.voice?.voiceBackend &&
      !voicesList.find((v) => v.value === currentVoiceId)
    ) {
      voicesList.push({ value: currentVoiceId, label: currentVoiceId })
    }
    setVoicesList(voicesList)
  })

  createEffect(
    on(
      () => props.edit,
      () => {
        const currentVoiceBackend = props.edit.voice?.voiceBackend || ''
        setVoiceBackend(currentVoiceBackend)
        const currentVoiceId = props.edit.voice?.voiceId || ''
        setVoice(currentVoiceId)
      }
    )
  )

  createEffect(() => {
    const type = voiceBackendsList()
    const list = voicesList()
    if (!type || !list || !list.length) {
      setVoice('')
      return
    }
    const current = voice()
    if (!list.find((v) => v.value === current)) {
      setVoice(list[0].value)
    }
  })

  createEffect(() => {
    const voiceId = voice()
    const type = voiceBackend()
    if (!voiceId || !type) {
      setVoicePreview(undefined)
      return
    }
    setVoicePreview(voices.voices[type]?.find((v) => v.id === voiceId)?.previewUrl)
  })

  return (
    <>
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="voiceBackend"
          items={voiceBackendsList()}
          value={voiceBackend()}
          label="Voice Backend"
          onChange={(ev) => setVoiceBackend(ev.value as AppSchema.VoiceBackend)}
        ></Select>
        <Show when={voiceBackend()}>
          <Select
            fieldName="voiceId"
            items={voicesList()}
            value={voice()}
            label="Voice"
            onChange={(ev) => setVoice(ev.value as string)}
          ></Select>
        </Show>
        <Show when={voicePreview()}>
          <div>
            <FormLabel label="Preview" />
            <div class="flex items-center">
              <div class="relative overflow-hidden rounded-xl bg-transparent">
                <Button onClick={() => playVoicePreview(voiceBackend()!, voicePreview()!)}>
                  <Play /> Preview
                </Button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </>
  )
}

export default VoicePicker
