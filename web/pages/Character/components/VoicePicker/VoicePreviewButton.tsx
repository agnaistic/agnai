import { Component, createEffect, createSignal } from 'solid-js'
import { voiceStore } from '/web/store/voice'
import { TTSService, VoiceWebSynthesisSettings, VoiceSettings } from '/common/types'
import { FormLabel } from '/web/shared/FormLabel'
import Button from '/web/shared/Button'
import { Play } from 'lucide-solid'
import { defaultCulture, getSampleText } from '/web/shared/CultureCodes'
import { AudioSource } from '../../../../shared/Audio/audio-source'
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
    let voiceId = props.voiceId

    const preview = voicePreviewUrl()
    if (!service || !voiceId) return

    let audio: AudioSource | undefined
    let rate = 1
    if (service === 'webspeechsynthesis') {
      const culture = props.culture || defaultCulture
      const voice: VoiceWebSynthesisSettings = {
        service: 'webspeechsynthesis',
        voiceId,
        ...props.voiceSettings,
      }
      audio = await createSpeech({
        kind: 'native',
        voice,
        text: getSampleText(culture),
        culture,
        filterAction: false,
      })
    } else if (preview) {
      audio = await createSpeech({ kind: 'remote', url: preview })
    } else {
      const culture = props.culture || defaultCulture
      const voice = {
        service,
        voiceId,
        ...props.voiceSettings,
      } as VoiceSettings
      rate = voice.rate ?? 1
      const { output } = await voiceApi.textToSpeech(getSampleText(culture), voice)
      audio = await createSpeech({ kind: 'remote', url: output })
    }
    audio?.play(rate)
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
