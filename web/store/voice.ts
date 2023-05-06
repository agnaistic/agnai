import { AppSchema } from '../../srv/db/schema'
import {
  VoiceSettings,
  VoiceWebSpeechSynthesisSettings,
  TTSService,
} from '../../srv/db/texttospeech-schema'
import { getSampleText } from '../shared/CultureCodes'
import { createStore, getStore } from './create'
import { voiceApi } from './data/voice'
import { msgStore } from './message'
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
)(() => {
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
    async *getVoices({ voices }, type: TTSService | '') {
      if (!type) return
      let result: AppSchema.VoiceDefinition[] | undefined
      if (type === 'webspeechsynthesis') {
        speechSynthesisManager.loadWebSpeechSynthesisVoices()
        return
      }
      if (voices[type]) return
      const res = await voiceApi.voicesList(type)
      if (res.error) toastStore.error(`Failed to get voices list: ${res.error}`)
      result = res.result?.voices
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

class SpeechSynthesisManager {
  currentAudio: HTMLAudioElement | undefined
  onVoicesLoadedCallbacks: onVoicesReadyFunction[] = []
  voices: SpeechSynthesisVoice[] = []
  voicesLoadToken: NodeJS.Timeout | undefined

  onVoicesLoaded(cb: onVoicesReadyFunction) {
    if (this.onVoicesLoadedCallbacks.length) {
      this.onVoicesLoadedCallbacks.push(cb)
      return
    }

    if (!this.voices.length) this.voices = speechSynthesis.getVoices()

    if (this.voices.length) {
      cb(this.voices)
      return
    }

    this.onVoicesLoadedCallbacks.push(cb)
    speechSynthesis.onvoiceschanged = () => {
      clearTimeout(this.voicesLoadToken)
      speechSynthesis.onvoiceschanged = null

      this.voices = speechSynthesis.getVoices()

      this.onVoicesLoadedCallbacks.forEach((cb) => cb(this.voices))
      this.onVoicesLoadedCallbacks.length = 0
    }
    this.voicesLoadToken = setTimeout(() => (speechSynthesis.onvoiceschanged = null), 10000)
  }

  loadWebSpeechSynthesisVoices() {
    var voices = speechSynthesis.getVoices()
    if (voices.length) {
      this.setVoices(voices)
    } else {
      this.onVoicesLoaded((voices) => {
        this.setVoices(voices)
      })
    }
  }

  setVoices(voices: SpeechSynthesisVoice[]) {
    const result = voices.map((voice) => ({
      id: voice.voiceURI,
      label: voice.name,
      previewUrl: voice.voiceURI,
    }))
    voiceStore.setState({
      voices: {
        ...voiceStore.getState().voices,
        ['webspeechsynthesis']: result || [{ id: '', label: 'No voices available' }],
      },
    })
  }

  stopCurrentVoice() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = undefined
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  playVoicePreview(voice: VoiceSettings, url: string | undefined, culture: string) {
    this.stopCurrentVoice()
    if (!voice.service) return
    if (voice.service === 'webspeechsynthesis') {
      this.playWebSpeechSynthesis(voice, getSampleText(culture), culture)
    } else if (url) {
      this.currentAudio = new Audio(url)
      this.currentAudio.play()
    }
  }

  async playWebSpeechSynthesis(
    voice: VoiceWebSpeechSynthesisSettings,
    text: string,
    culture: string,
    msgId?: string
  ) {
    if (!window.speechSynthesis) {
      toastStore.error(`Web speech synthesis not supported on this browser`)
      return
    }
    this.stopCurrentVoice()
    if (msgId) msgStore.setState({ speaking: { messageId: msgId, status: 'playing' } })
    await new Promise((resolve, reject) => {
      this.onVoicesLoaded((voices) => {
        const syntheticVoice = voices.find((v) => v.voiceURI === voice.voiceId)
        if (!syntheticVoice) {
          toastStore.error(`Voice ${voice.voiceId} not found in web speech synthesis`)
          return
        }
        var speech = new SpeechSynthesisUtterance()
        const filterAction = getStore('user').getState().user?.texttospeech?.filterActions ?? false
        if (filterAction) {
          const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
          text = text.replace(filterActionsRegex, '   ')
        }
        speech.text = text
        speech.voice = syntheticVoice
        speech.lang = culture
        speech.pitch = voice.pitch || 1
        speech.rate = voice.rate || 1
        speech.addEventListener('end', resolve)
        speech.addEventListener('error', resolve)
        speechSynthesis.speak(speech)
      })
    })
    if (msgId) msgStore.setState({ speaking: undefined })
  }
}
export const speechSynthesisManager = new SpeechSynthesisManager()
