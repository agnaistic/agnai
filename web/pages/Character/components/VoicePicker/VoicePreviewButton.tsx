import { Component, Show, createEffect, createSignal } from 'solid-js'
import { speechSynthesisManager, voiceStore } from '../../../../store/voice'
import {
  CharacterVoiceSettings,
  TextToSpeechBackend,
} from '../../../../../srv/db/texttospeech-schema'
import { FormLabel } from '../../../../shared/FormLabel'
import Button from '../../../../shared/Button'
import { Play } from 'lucide-solid'
import { defaultCulture } from '../../../../shared/CultureCodes'
import { CharacterVoiceWebSpeechSynthesisSettingsSpecific } from './WebSpeechSynthesisSettings'

export const VoicePreviewButton: Component<{
  backend: TextToSpeechBackend
  voiceId?: string
  culture?: string
  webSpeechSynthesisSettings?: CharacterVoiceWebSpeechSynthesisSettingsSpecific
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
    const voiceId = props.voiceId
    const preview = voicePreviewUrl()
    if (!backend || !voiceId || !preview) return
    let voice: CharacterVoiceSettings
    if (backend == 'webspeechsynthesis') {
      voice = { backend, voiceId, ...props.webSpeechSynthesisSettings }
    } else if (backend === 'elevenlabs') {
      voice = { backend, voiceId }
    } else {
      return
    }
    speechSynthesisManager.playVoicePreview(voice, preview, props.culture || defaultCulture)
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
