import { Component, Show, createEffect, createSignal } from 'solid-js'
import { speechSynthesisManager, voiceStore } from '/web/store/voice'
import { VoiceSettings, TTSService, VoiceSettingForm } from '/srv/db/texttospeech-schema'
import { FormLabel } from '/web/shared/FormLabel'
import Button from '/web/shared/Button'
import { Play } from 'lucide-solid'
import { defaultCulture } from '/web/shared/CultureCodes'

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

    let voice: VoiceSettings
    if (service == 'webspeechsynthesis') {
      voice = { service: service, voiceId, ...props.webSpeechSynthesisSettings }
    } else if (service === 'elevenlabs') {
      voice = { service: service, voiceId }
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
