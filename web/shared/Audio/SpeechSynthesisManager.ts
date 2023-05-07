import { getSampleText } from '../CultureCodes'
import { speechManager } from './SpeechManager'
import { AppSchema } from '/srv/db/schema'
import { VoiceSettings, VoiceWebSpeechSynthesisSettings } from '/srv/db/texttospeech-schema'

type onVoicesReadyFunction = (voices: SpeechSynthesisVoice[]) => void

class SpeechSynthesisManager {
  onVoicesLoadedCallbacks: onVoicesReadyFunction[] = []
  voices: SpeechSynthesisVoice[] = []
  voicesLoadToken: NodeJS.Timeout | undefined

  isSupported() {
    return window.speechSynthesis
  }

  async loadWebSpeechSynthesisVoices(): Promise<AppSchema.VoiceDefinition[]> {
    return await new Promise((resolve, reject) => {
      var voices = speechSynthesis.getVoices()
      if (voices.length) {
        resolve(this.convertToOptions(voices))
      } else {
        this.onVoicesLoaded((voices) => {
          resolve(this.convertToOptions(voices))
        })
      }
    })
  }

  private onVoicesLoaded(cb: onVoicesReadyFunction) {
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

  private convertToOptions(voices: SpeechSynthesisVoice[]) {
    return voices.map((voice) => ({
      id: voice.voiceURI,
      label: voice.name,
      previewUrl: voice.voiceURI,
    }))
  }

  async createSpeechSynthesis(
    voice: VoiceWebSpeechSynthesisSettings,
    text: string,
    culture: string,
    filterAction: boolean
  ): Promise<SpeechSynthesisUtterance> {
    return await new Promise((resolve, reject) => {
      this.onVoicesLoaded((voices) => {
        const syntheticVoice = voices.find((v) => v.voiceURI === voice.voiceId)
        if (!syntheticVoice) {
          reject(new Error(`Voice ${voice.voiceId} not found in web speech synthesis`))
          return
        }
        var speech = new SpeechSynthesisUtterance()
        if (filterAction) {
          const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
          text = text.replace(filterActionsRegex, '   ')
        }
        speech.text = text
        speech.voice = syntheticVoice
        speech.lang = culture
        speech.pitch = voice.pitch || 1
        speech.rate = voice.rate || 1
        resolve(speech)
      })
    })
  }
}

export const speechSynthesisManager = new SpeechSynthesisManager()
