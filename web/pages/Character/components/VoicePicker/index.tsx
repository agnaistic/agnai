import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import {
  CharacterVoiceSettings,
  TextToSpeechBackend,
} from '../../../../../srv/db/texttospeech-schema'
import { VoiceBackendSelect } from './VoiceBackendSelect'
import { VoiceIdSelect } from './VoiceIdSelect'
import { VoicePreviewButton } from './VoicePreviewButton'
import {
  CharacterVoiceElevenLabsSettingsSpecific,
  ElevenLabsSettings,
  defaultElevenLabsSettings,
} from './ElevenLabsSettings'
import {
  CharacterVoiceWebSpeechSynthesisSettingsSpecific,
  WebSpeechSynthesisSettings,
  defaultWebSpeechSynthesisSettings,
} from './WebSpeechSynthesisSettings'
export const VoicePicker: Component<{
  value: CharacterVoiceSettings
  culture: string
  onChange: (value: CharacterVoiceSettings) => void
}> = (props) => {
  let previousSettings: CharacterVoiceSettings | undefined
  const [backend, setBackend] = createSignal<TextToSpeechBackend>()
  const [voiceId, setVoiceId] = createSignal<string>()
  const value = createMemo(() => props.value)

  const [webSpeechSynthesisSettings, setWebSpeechSynthesisSettings] =
    createSignal<CharacterVoiceWebSpeechSynthesisSettingsSpecific>()
  const [elevenLabsSettings, setElevenLabsSettings] =
    createSignal<CharacterVoiceElevenLabsSettingsSpecific>()

  createEffect(
    on(value, (value) => {
      setBackend(value.backend)
      setVoiceId('voiceId' in props.value ? props.value.voiceId : '')
      updateBackend()
    })
  )

  createEffect(() => {
    const b = backend()
    if ('voiceId' in props.value && props.value.backend === b) setVoiceId(props.value.voiceId)
    else setVoiceId('')
  })

  createEffect(() => {
    if (props.value.backend !== backend()) {
      setVoiceId('')
      updateBackend()
    } else if ('voiceId' in props.value) {
      setVoiceId(props.value.voiceId)
    } else {
      setVoiceId('')
    }
  })

  function updateBackend() {
    const b = backend()
    switch (b) {
      case 'elevenlabs':
        if (props.value.backend === b) {
          const { voiceId, backend, ...previousSettings } = props.value
          setElevenLabsSettings(previousSettings)
        } else {
          setElevenLabsSettings(defaultElevenLabsSettings)
        }
        break
      case 'webspeechsynthesis':
        if (props.value.backend === b) {
          const { voiceId, backend, ...previousSettings } = props.value
          setWebSpeechSynthesisSettings(previousSettings)
        } else {
          setWebSpeechSynthesisSettings(defaultWebSpeechSynthesisSettings)
        }
        break
    }
  }

  createEffect(
    on(
      () => [backend(), voiceId(), elevenLabsSettings(), webSpeechSynthesisSettings()],
      () => {
        const settings = getSettings()
        if (!settings) return
        if (
          previousSettings &&
          Array.from(new Set([...Object.keys(previousSettings), ...Object.keys(settings)])).every(
            (k) => (previousSettings as any)[k] === (settings as any)[k]
          )
        )
          return
        previousSettings = settings
        props.onChange(settings)
      }
    )
  )

  function getSettings(): CharacterVoiceSettings | undefined {
    const b = backend()
    const v = voiceId()
    const elevenlabs = elevenLabsSettings()
    const webspeechsynthesis = webSpeechSynthesisSettings()

    switch (b) {
      case 'elevenlabs': {
        if (!v) return undefined
        return {
          backend: 'elevenlabs',
          voiceId: v,
          ...elevenlabs,
        }
        break
      }
      case 'webspeechsynthesis': {
        if (!v) return undefined
        return {
          backend: 'webspeechsynthesis',
          voiceId: v,
          ...webspeechsynthesis,
        }
        break
      }
      default:
        return {
          backend: undefined,
        }
    }
  }

  return (
    <>
      <div class="flex flex-row justify-start gap-4">
        <VoiceBackendSelect value={backend()} onChange={setBackend} />
        <Show when={!!backend()}>
          <VoiceIdSelect backend={backend()!} value={voiceId()} onChange={setVoiceId} />
          <VoicePreviewButton
            backend={backend()!}
            voiceId={voiceId()}
            culture={props.culture}
            webSpeechSynthesisSettings={webSpeechSynthesisSettings()}
          />
        </Show>
      </div>

      <Show when={backend() === 'elevenlabs' && !!elevenLabsSettings()}>
        <ElevenLabsSettings
          settings={elevenLabsSettings()!}
          onChange={(update) => setElevenLabsSettings(update)}
        />
      </Show>

      <Show when={backend() === 'webspeechsynthesis' && !!webSpeechSynthesisSettings()}>
        <WebSpeechSynthesisSettings
          settings={webSpeechSynthesisSettings()!}
          onChange={(update) => setWebSpeechSynthesisSettings(update)}
        />
      </Show>
    </>
  )
}

export default VoicePicker
