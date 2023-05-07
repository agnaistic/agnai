import { AudioReference } from './AudioReference'
import { speechSynthesisManager } from './SpeechSynthesisManager'
import { UrlAudioReference } from './UrlAudioReference'
import { VoiceWebSpeechSynthesisSettings } from '/srv/db/texttospeech-schema'
import { WebSpeechSynthesisAudioReference } from './WebSpeechSynthesisAudioReference'

class SpeechManager {
  current: AudioReference | undefined

  createSpeechFromUrl(url: string) {
    this.cancel()

    const audio = new Audio(url)
    this.current = new UrlAudioReference(audio)
    return this.current
  }

  async createSpeechFromBrowser(
    voice: VoiceWebSpeechSynthesisSettings,
    text: string,
    culture: string,
    filterAction: boolean
  ) {
    const utterance = await speechSynthesisManager.createSpeechSynthesis(
      voice,
      text,
      culture,
      filterAction
    )
    this.current = new WebSpeechSynthesisAudioReference(utterance)
    return this.current
  }

  cancel() {
    if (this.current) this.current.pause()
  }
}

export const speechManager = new SpeechManager()
