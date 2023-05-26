import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { VoiceSettings, TTSService, VoiceSettingForm } from '/srv/db/texttospeech-schema'
import { VoiceServiceSelect } from './VoiceServiceSelect'
import { VoiceIdSelect } from './VoiceIdSelect'
import { VoicePreviewButton } from './VoicePreviewButton'
import { ElevenLabsSettings, defaultElevenLabsSettings } from './ElevenLabsSettings'
import { WebSpeechSynthesisSettings } from './WebSpeechSynthesisSettings'
import { NovelTtsSettings } from './NovelTtsSettings'
import { isDirty } from '/web/shared/util'

export const VoicePicker: Component<{
  value: VoiceSettings
  culture: string
  onChange: (value: VoiceSettings) => void
}> = (props) => {
  let previousSettings: VoiceSettings | undefined
  const [service, setService] = createSignal<TTSService>()
  const [voiceId, setVoiceId] = createSignal<string>()
  const value = createMemo(() => props.value)

  const [webSpeechSettings, setWebSpeechSettings] =
    createSignal<VoiceSettingForm<'webspeechsynthesis'>>()
  const [elevenLabsSettings, setElevenLabsSettings] = createSignal<VoiceSettingForm<'elevenlabs'>>()
  const [novelTtsSettings, setNovelTtsSettings] = createSignal<VoiceSettingForm<'novel'>>()

  createEffect(
    on(value, (value) => {
      setService(value.service)
      setVoiceId('voiceId' in props.value ? props.value.voiceId : '')
      updateService()
    })
  )

  createEffect(() => {
    const b = service()
    if ('voiceId' in props.value && props.value.service === b) setVoiceId(props.value.voiceId)
    else setVoiceId('')
  })

  createEffect(() => {
    if (props.value.service !== service()) {
      setVoiceId('')
      updateService()
    } else if ('voiceId' in props.value) {
      setVoiceId(props.value.voiceId)
    } else {
      setVoiceId('')
    }
  })

  function updateService() {
    const b = service()
    switch (b) {
      case 'elevenlabs':
        if (props.value.service === b) {
          const { voiceId, service, ...previousSettings } = props.value
          setElevenLabsSettings(previousSettings)
        } else {
          setElevenLabsSettings(defaultElevenLabsSettings)
        }
        break
      case 'webspeechsynthesis':
        if (props.value.service === b) {
          const { voiceId, service, ...previousSettings } = props.value
          setWebSpeechSettings(previousSettings)
        } else {
          setWebSpeechSettings({})
        }
        break
      case 'novel':
        if (props.value.service === b) {
          const { voiceId, service, ...previousSettings } = props.value
          setNovelTtsSettings(previousSettings)
        } else {
          setNovelTtsSettings({})
        }
        break
    }
  }

  createEffect(
    on(
      () => [service(), voiceId(), elevenLabsSettings(), webSpeechSettings(), novelTtsSettings()],
      () => {
        const settings = getSettings()
        if (!settings) return
        if (previousSettings && !isDirty(previousSettings, settings)) return

        previousSettings = settings
        props.onChange(settings)
      }
    )
  )

  function getSettings(): VoiceSettings | undefined {
    const svc = service()
    const voice = voiceId()
    const elevenlabs = elevenLabsSettings()
    const webspeechsynthesis = webSpeechSettings()
    const novelTts = novelTtsSettings()

    switch (svc) {
      case 'elevenlabs': {
        if (!voice) return undefined
        return {
          service: 'elevenlabs',
          voiceId: voice,
          ...elevenlabs,
        }
        break
      }

      case 'webspeechsynthesis': {
        if (!voice) return undefined
        return {
          service: 'webspeechsynthesis',
          voiceId: voice,
          ...webspeechsynthesis,
        }
        break
      }

      case 'novel': {
        if (!voice) return undefined
        return {
          service: 'novel',
          voiceId: voice,
          ...novelTts,
        }
        break
      }

      default:
        return {
          service: undefined,
        }
    }
  }

  return (
    <>
      <div class="flex flex-row flex-wrap justify-start gap-4 md:flex-nowrap">
        <VoiceServiceSelect value={service()} onChange={setService} />
        <Show when={!!service()}>
          <VoiceIdSelect service={service()!} value={voiceId()} onChange={setVoiceId} />
          <VoicePreviewButton
            service={service()!}
            voiceId={voiceId()}
            culture={props.culture}
            webSpeechSynthesisSettings={webSpeechSettings()}
          />
        </Show>
      </div>

      <Show when={service() === 'elevenlabs' && !!elevenLabsSettings()}>
        <ElevenLabsSettings
          settings={elevenLabsSettings()!}
          onChange={(update) => setElevenLabsSettings(update)}
        />
      </Show>

      <Show when={service() === 'webspeechsynthesis' && !!webSpeechSettings()}>
        <WebSpeechSynthesisSettings
          settings={webSpeechSettings()!}
          onChange={(update) => setWebSpeechSettings(update)}
        />
      </Show>

      <Show when={service() === 'novel' && !!novelTtsSettings()}>
        <NovelTtsSettings
          settings={novelTtsSettings()!}
          onChange={(update) => setNovelTtsSettings(update)}
        />
      </Show>
    </>
  )
}

export default VoicePicker
