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
import { deepEqual, deepStrictEqual } from 'assert'

export const VoicePicker: Component<{
  value: CharacterVoiceSettings
  onChange: (value: CharacterVoiceSettings) => void
}> = (props) => {
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
        setElevenLabsSettings(props.value.backend === b ? props.value : defaultElevenLabsSettings)
        break
      case 'webspeechsynthesis':
        setWebSpeechSynthesisSettings(
          props.value.backend === b ? props.value : defaultWebSpeechSynthesisSettings
        )
        break
    }
  }

  createEffect(() => {
    const b = backend()
    const v = voiceId()
    const elevenlabs = elevenLabsSettings()
    const webspeechsynthesis = webSpeechSynthesisSettings()

    let settings: CharacterVoiceSettings

    switch (b) {
      case 'elevenlabs': {
        if (!v) return
        settings = {
          backend: 'elevenlabs',
          voiceId: v,
          ...elevenlabs,
        }
        break
      }
      case 'webspeechsynthesis': {
        if (!v) return
        settings = {
          backend: 'webspeechsynthesis',
          voiceId: v,
          ...webspeechsynthesis,
        }
        break
      }
      default:
        settings = {
          backend: undefined,
        }
        break
    }

    if (Object.keys(props.value).every((k) => (props.value as any)[k] === (settings as any)[k]))
      return
    props.onChange(settings)
  })

  return (
    <>
      <div class="flex flex-row justify-start gap-4">
        <VoiceBackendSelect value={backend()} onChange={setBackend} />
        <Show when={!!backend()}>
          <VoiceIdSelect backend={backend()!} value={voiceId()} onChange={setVoiceId} />
          <VoicePreviewButton backend={backend()!} voiceId={voiceId()} />
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
