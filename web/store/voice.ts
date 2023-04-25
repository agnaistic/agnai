import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { data } from './data'
import { toastStore } from './toasts'
import { userStore } from './user'

type VoiceState = {
  types: { type: AppSchema.VoiceBackend; label: string }[]
  voices: { [type: string]: AppSchema.VoiceDefinition[] }
}

const initialState: VoiceState = {
  types: [],
  voices: {},
}

export const voiceStore = createStore<VoiceState>(
  'voices',
  initialState
)(() => {
  return {
    getBackends() {
      const user = userStore().user
      const types: VoiceState['types'] = []
      if (!user) return { backends: types }
      if (user.elevenLabsApiKeySet) {
        types.push({
          type: 'elevenlabs',
          label: 'ElevenLabs',
        })
      }
      return { types }
    },
    async *getVoices({ voices }, type: AppSchema.VoiceBackend | '') {
      if (!type) {
        return
      }
      if (voices[type]) {
        return
      }
      const res = await data.voice.voicesList(type)
      if (res.error) {
        toastStore.error(`Failed to update book: ${res.error}`)
      }
      return {
        voices: {
          ...voices,
          [type]: res.result?.voices || [{ id: '', label: 'No voices available' }],
        },
      }
    },
  }
})
