import { Component, createEffect, createSignal } from 'solid-js'
import { voiceStore } from '/web/store/voice'
import { TTSService, VoiceWebSynthesisSettings, VoiceSettings } from '/common/types'
import { FormLabel } from '/web/shared/FormLabel'
import Button from '/web/shared/Button'
import { Play } from 'lucide-solid'
import { defaultCulture, getSampleText } from '/web/shared/CultureCodes'
import { AudioReference } from '/web/shared/Audio/AudioReference'
import { createSpeech } from '/web/shared/Audio/speech'
import { voiceApi } from '/web/store/data/voice'

export const VoicePreviewButton: Component<{
  service: TTSService
  voiceId?: string
  culture?: string
  voiceSettings?: any
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

  const playVoicePreview = async () => {
    const service = props.service
    const voiceId = props.voiceId
    const preview = voicePreviewUrl()
    if (!service || !voiceId) return

    let audio: AudioReference | undefined
    if (service === 'webspeechsynthesis') {
      const culture = props.culture || defaultCulture
      const voice: VoiceWebSynthesisSettings = {
        service: 'webspeechsynthesis',
        voiceId,
        ...props.voiceSettings,
      }
      audio = await createSpeech({
        voice,
        text: getSampleText(culture),
        culture,
        filterAction: false,
      })
    } else if (preview) {
      audio = await createSpeech({ url: preview })
    } else {
      const culture = props.culture || defaultCulture
      const voice = {
        service,
        voiceId,
        ...props.voiceSettings,
      } as VoiceSettings
      const { output } = await voiceApi.textToSpeech(getSampleText(culture), voice)
      audio = await createSpeech({ url: output })
    }
    audio?.play()
  }

  return (
    <>
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
    </>
  )
}
