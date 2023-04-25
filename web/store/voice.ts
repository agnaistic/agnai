import { AppSchema } from '../../srv/db/schema'
import { createStore, getStore } from './create'
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
      if ('speechSynthesis' in window) {
        types.push({
          type: 'webspeechsynthesis',
          label: 'Web Speech Synthesis',
        })
      }
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
      let result: AppSchema.VoiceDefinition[] | undefined
      if (type === 'webspeechsynthesis') {
        result = getWebSpeechSynthesisVoices()
      } else {
        const res = await data.voice.voicesList(type)
        if (res.error) {
          toastStore.error(`Failed to get voices list: ${res.error}`)
        }
        result = res.result?.voices
      }
      return {
        voices: {
          ...voices,
          [type]: result || [{ id: '', label: 'No voices available' }],
        },
      }
    },
  }
})

const getWebSpeechSynthesisVoices = (): AppSchema.VoiceDefinition[] => {
  var voices = speechSynthesis.getVoices()
  return voices.map((voice) => ({
    id: voice.voiceURI,
    label: voice.name,
    previewUrl: voice.voiceURI,
  }))
}

export function playVoicePreview(url: string) {
  if (url.startsWith('urn:')) {
    playWebSpeechSynthesis(url, 'This is how I sound when I speak.')
  } else {
    new Audio(url).play()
  }
}

export function playWebSpeechSynthesis(voiceId: string, text: string) {
  if (!window.speechSynthesis) {
    toastStore.error(`Web speech synthesis not supported`)
    return
  }
  var speech = new SpeechSynthesisUtterance()
  const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceId)
  if (!voice) {
    toastStore.error(`Voice ${voiceId} not found in web speech synthesis`)
    return
  }
  const filterAction = getStore('user').getState().user?.voice?.filterActions ?? true
  if (filterAction) {
    const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
    text = text.replace(filterActionsRegex, '...')
  }
  speech.text = text
  speech.voice = voice
  speechSynthesis.speak(speech)
}
