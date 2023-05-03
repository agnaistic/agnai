import { AppSchema } from '../../srv/db/schema'
import { createStore, getStore } from './create'
import { voiceApi } from './data/voice'
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

let currentAudio: HTMLAudioElement | undefined

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
      let result: AppSchema.VoiceDefinition[] | undefined
      if (type === 'webspeechsynthesis') {
        result = getWebSpeechSynthesisVoices()
      } else {
        if (voices[type]) {
          return
        }
        const res = await voiceApi.voicesList(type)
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

type onVoicesReadyFunction = (voices: SpeechSynthesisVoice[]) => void
const onVoicesLoadedCallbacks: onVoicesReadyFunction[] = []
let voices: SpeechSynthesisVoice[] = []
let voicesLoadToken: NodeJS.Timeout | undefined

const onVoicesLoaded = (cb: onVoicesReadyFunction) => {
  if (onVoicesLoadedCallbacks.length) {
    onVoicesLoadedCallbacks.push(cb)
    return
  }

  if (!voices.length) voices = speechSynthesis.getVoices()

  if (voices.length) {
    cb(voices)
    return
  }

  onVoicesLoadedCallbacks.push(cb)
  speechSynthesis.onvoiceschanged = () => {
    clearTimeout(voicesLoadToken)
    speechSynthesis.onvoiceschanged = null

    voices = speechSynthesis.getVoices()

    onVoicesLoadedCallbacks.forEach((cb) => cb(voices))
    onVoicesLoadedCallbacks.length = 0
  }
  voicesLoadToken = setTimeout(() => (speechSynthesis.onvoiceschanged = null), 10000)
}

const getWebSpeechSynthesisVoices = (): AppSchema.VoiceDefinition[] => {
  var voices = speechSynthesis.getVoices()
  if (!voices.length) {
    onVoicesLoaded(() => {
      voiceStore.getVoices('webspeechsynthesis')
    })
    return []
  } else {
    return voices.map((voice) => ({
      id: voice.voiceURI,
      label: voice.name,
      previewUrl: voice.voiceURI,
    }))
  }
}

export function stopCurrentVoice() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = undefined
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function playVoicePreview(backend: AppSchema.VoiceBackend, url: string) {
  stopCurrentVoice()
  if (!url) return
  if (backend === 'webspeechsynthesis') {
    playWebSpeechSynthesis(url, 'This is how I sound when I speak.')
  } else {
    new Audio(url).play()
  }
}

export function playWebSpeechSynthesis(voiceId: string, text: string) {
  if (!window.speechSynthesis) {
    toastStore.error(`Web speech synthesis not supported on this browser`)
    return
  }
  onVoicesLoaded((voices) => {
    const voice = voices.find((v) => v.voiceURI === voiceId)
    if (!voice) {
      toastStore.error(`Voice ${voiceId} not found in web speech synthesis`)
      return
    }
    var speech = new SpeechSynthesisUtterance()
    const filterAction = getStore('user').getState().user?.voice?.filterActions ?? true
    if (filterAction) {
      const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
      text = text.replace(filterActionsRegex, '...')
    }
    speech.text = text
    speech.voice = voice
    speechSynthesis.speak(speech)
  })
}
