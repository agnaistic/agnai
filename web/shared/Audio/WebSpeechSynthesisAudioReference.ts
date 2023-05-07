import { AudioReference, AudioReferenceErrorEvent, AudioReferenceEvent } from './AudioReference'

export class WebSpeechSynthesisAudioReference extends AudioReference {
  speech: SpeechSynthesisUtterance

  constructor(speech: SpeechSynthesisUtterance) {
    super()
    this.speech = speech
    speech.addEventListener('error', (e) => {
      if (e.error === 'interrupted') return
      if (e.error === 'canceled') return
      this.dispatchEvent(new AudioReferenceErrorEvent('error', e.error))
    })
    speech.addEventListener('start', () => {
      this.dispatchEvent(new AudioReferenceEvent('playing'))
    })
    speech.addEventListener('end', () => {
      this.dispatchEvent(new AudioReferenceEvent('ended'))
    })
  }

  override play() {
    speechSynthesis.speak(this.speech)
  }

  override pause() {
    speechSynthesis.cancel()
  }
}
