import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { VoiceSettings, TTSService, VoiceSettingForm } from '/common/types'
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
    const svc = service()
    if ('voiceId' in props.value && props.value.service === svc) setVoiceId(props.value.voiceId)
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
    const svc = service()
    switch (svc) {
      case 'elevenlabs':
        if (props.value.service === svc) {
          const { voiceId, service, ...previousSettings } = props.value
          setElevenLabsSettings(previousSettings)
        } else {
          setElevenLabsSettings(defaultElevenLabsSettings)
        }
        break
      case 'webspeechsynthesis':
        if (props.value.service === svc) {
          const { voiceId, service, ...previousSettings } = props.value
          setWebSpeechSettings(previousSettings)
        } else {
          setWebSpeechSettings({})
        }
        break
      case 'novel':
        if (props.value.service === svc) {
          const { voiceId, service, ...previousSettings } = props.value
          setNovelTtsSettings(previousSettings)
        } else {
          setNovelTtsSettings({})
        }
        break
    }
  }

  createEffect(() => {
    const currentSettings = voiceSettings()
    if (!currentSettings) return
    if (previousSettings && !isDirty(previousSettings, currentSettings)) return

    previousSettings = currentSettings
    props.onChange(currentSettings)
  })

  const voiceSettings = createMemo<VoiceSettings | undefined>(() => {
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
      }

      case 'webspeechsynthesis': {
        if (!voice) return undefined
        return {
          service: 'webspeechsynthesis',
          voiceId: voice,
          ...webspeechsynthesis,
        }
      }

      case 'novel': {
        if (!voice) return undefined
        return {
          service: 'novel',
          voiceId: voice,
          ...novelTts,
        }
      }

      default:
        return {
          service: undefined,
        }
    }
  })

  return (
    <>
      <div class="flex flex-row flex-wrap justify-start gap-4">
        <VoiceServiceSelect value={service()} onChange={setService} />
        <Show when={!!service()}>
          <VoiceIdSelect service={service()!} value={voiceId()} onChange={setVoiceId} />
          <VoicePreviewButton
            service={service()!}
            voiceId={voiceId()}
            culture={props.culture}
            voiceSettings={voiceSettings()}
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
