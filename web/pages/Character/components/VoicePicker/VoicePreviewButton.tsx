import { Component, Show, createEffect, createSignal } from 'solid-js'
import { voiceStore } from '/web/store/voice'
import {
  TTSService,
  VoiceSettingForm,
  VoiceWebSpeechSynthesisSettings,
} from '/srv/db/texttospeech-schema'
import { FormLabel } from '/web/shared/FormLabel'
import Button from '/web/shared/Button'
import { Play } from 'lucide-solid'
import { defaultCulture, getSampleText } from '/web/shared/CultureCodes'
import { speechManager } from '/web/shared/Audio/SpeechManager'

export const VoicePreviewButton: Component<{
  service: TTSService
  voiceId?: string
  culture?: string
  webSpeechSynthesisSettings?: VoiceSettingForm<'webspeechsynthesis'>
}> = (props) => {
  const state = voiceStore((s) => s.voices)

  const [voicePreviewUrl, setVoicePreviewUrl] = createSignal<string>()

  createEffect(() => {
    if (!props.service || !props.voiceId) {
      setVoicePreviewUrl()
      return
    }
    setVoicePreviewUrl(state[props.service]?.find((v) => v.id === props.voiceId)?.previewUrl)
  })

  const playVoicePreview = () => {
    const service = props.service
    const voiceId = props.voiceId
    const preview = voicePreviewUrl()
    if (!service || !voiceId || !preview) return

    if (service == 'webspeechsynthesis') {
      const culture = props.culture || defaultCulture
      const voice: VoiceWebSpeechSynthesisSettings = {
        service: 'webspeechsynthesis',
        voiceId: voiceId,
        ...props.webSpeechSynthesisSettings,
      }
      speechManager.playWebSpeechSynthesis(voice, getSampleText(culture), culture, false)
    } else if (preview) {
      speechManager.createSpeechFromUrl(preview)
    }
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
