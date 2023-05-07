import { AppSchema } from '../../srv/db/schema'
import { TTSService } from '../../srv/db/texttospeech-schema'
import { speechSynthesisManager } from '../shared/Audio/SpeechSynthesisManager'
import { createStore } from './create'
import { voiceApi } from './data/voice'
import { toastStore } from './toasts'
import { userStore } from './user'

type VoiceState = {
  services: { type: TTSService; label: string }[]
  voices: { [type: string]: AppSchema.VoiceDefinition[] }
}

const initialState: VoiceState = {
  services: [],
  voices: {},
}

export const voiceStore = createStore<VoiceState>(
  'voices',
  initialState
)((get, set) => {
  return {
    getServices() {
      const user = userStore().user
      const services: VoiceState['services'] = []
      if ('speechSynthesis' in window) {
        services.push({
          type: 'webspeechsynthesis',
          label: 'Web Speech Synthesis',
        })
      }
      if (!user) return { services }
      if (user.elevenLabsApiKeySet) {
        services.push({
          type: 'elevenlabs',
          label: 'ElevenLabs',
        })
      }
      return { services }
    },
    async getVoices({ voices }, type: TTSService | '') {
      if (!type) return
      let result: AppSchema.VoiceDefinition[] | undefined
      if (voices[type]?.length > 0) return
      if (type === 'webspeechsynthesis') {
        result = await speechSynthesisManager.loadWebSpeechSynthesisVoices()
      } else {
        const res = await voiceApi.voicesList(type)
        if (res.error) toastStore.error(`Failed to get voices list: ${res.error}`)
        result = res.result?.voices
      }
      set({
        voices: {
          ...voices,
          [type]: result || [{ id: '', label: 'No voices available' }],
        },
      })
    },
  }
})
