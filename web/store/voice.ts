import { AppSchema } from '../../common/types/schema'
import { TTSService } from '../../common/types/texttospeech-schema'
import { getNativeVoices, isNativeSpeechSupported } from '../shared/Audio/speech'
import { createStore } from './create'
import { voiceApi } from './data/voice'
import { toastStore } from './toasts'
import { userStore } from './user'

type VoiceState = {
  services: Array<{ type: TTSService; label: string }>
  voices: Record<string, AppSchema.VoiceDefinition[]>
  models: Record<string, AppSchema.VoiceModelDefinition[]>
}

const initialState: VoiceState = {
  services: [],
  voices: {},
  models: {},
}

export const voiceStore = createStore<VoiceState>(
  'voices',
  initialState
)(() => {
  return {
    getServices() {
      const user = userStore.getState().user
      const services: VoiceState['services'] = []

      if (isNativeSpeechSupported()) {
        services.push({
          type: 'webspeechsynthesis',
          label: 'Web Speech Synthesis',
        })
      }

      if (!user) return { services }

      if (user.elevenLabsApiKeySet || user.elevenLabsApiKey) {
        services.push({
          type: 'elevenlabs',
          label: 'ElevenLabs',
        })
      }

      if (user.novelVerified || user.novelApiKey) {
        services.push({
          type: 'novel',
          label: 'NovelAI Text To Speech',
        })
      }

      return { services }
    },
    async getVoices({ voices }, type: TTSService | '') {
      if (!type) return
      if (voices[type]?.length > 0) return

      let result = undefined
      if (type === 'webspeechsynthesis') {
        result = await getNativeVoices()
      } else {
        const res = await voiceApi.voicesList(type)
        if (res.error) toastStore.error(`Failed to get voices list: ${res.error}`)
        if (res.result) result = res.result!.voices
      }
      return {
        voices: {
          ...voices,
          [type]: result || [{ id: '', label: 'No voices available' }],
        },
      }
    },
    async getVoiceModels({ models }, type: TTSService | '') {
      if (type !== 'elevenlabs') return

      let result = undefined
      const res = await voiceApi.modelsList(type)
      if (res.error) toastStore.error(`Failed to get voice models list: ${res.error}`)
      if (res.result) result = res.result!.models

      return {
        models: {
          ...models,
          [type]: result || [{ id: '', label: 'No models available' }],
        },
      }
    },
  }
})
