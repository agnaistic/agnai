import { AppSchema } from '/srv/db/schema'
import { VoiceWebSynthesisSettings } from '/srv/db/texttospeech-schema'

type VoiceCallback = (voices: SpeechSynthesisVoice[]) => void

class SpeechSynthesisManager {
  onVoicesLoadedCallbacks: VoiceCallback[] = []
  voices: SpeechSynthesisVoice[] = []
  voicesLoadToken: NodeJS.Timeout | undefined

  loadWebSpeechSynthesisVoices(): Promise<AppSchema.VoiceDefinition[]> {
    return new Promise((resolve, reject) => {
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

  private onVoicesLoaded(cb: VoiceCallback) {
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
    voice: VoiceWebSynthesisSettings,
    text: string,
    culture: string,
    filterAction: boolean
  ) {
    return new Promise<SpeechSynthesisUtterance>((resolve, reject) => {
      this.onVoicesLoaded((voices) => {
        const syntheticVoice = voices.find((v) => v.voiceURI === voice.voiceId)
        if (!syntheticVoice) {
          reject(new Error(`Voice ${voice.voiceId} not found in web speech synthesis`))
          return
        }
        const speech = new SpeechSynthesisUtterance()
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
