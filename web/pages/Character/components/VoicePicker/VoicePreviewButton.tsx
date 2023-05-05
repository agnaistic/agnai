import { Component, Show, createEffect, createSignal } from 'solid-js'
import { speechSynthesisManager, voiceStore } from '../../../../store/voice'
import { TextToSpeechBackend } from '../../../../../srv/db/texttospeech-schema'
import { FormLabel } from '../../../../shared/FormLabel'
import Button from '../../../../shared/Button'
import { Play } from 'lucide-solid'

export const VoicePreviewButton: Component<{
  backend?: TextToSpeechBackend
  voiceId?: string
}> = (props) => {
  const state = voiceStore((s) => s.voices)

  const [voicePreviewUrl, setVoicePreviewUrl] = createSignal<string>()

  createEffect(() => {
    if (!props.backend || !props.voiceId) {
      setVoicePreviewUrl()
      return
    }
    setVoicePreviewUrl(state[props.backend]?.find((v) => v.id === props.voiceId)?.previewUrl)
  })

  const playVoicePreview = () => {
    const backend = props.backend
    const preview = voicePreviewUrl()
    if (!backend || !preview) return
    speechSynthesisManager.playVoicePreview(backend, preview)
  }

  return (
    <>
      <Show when={voicePreviewUrl()}>
        <div>
          <FormLabel label="Preview" />
          <div class="flex items-center">
            <div class="relative overflow-hidden rounded-xl bg-transparent">
              <Button onClick={playVoicePreview}>
                <Play /> Preview
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </>
  )
}
