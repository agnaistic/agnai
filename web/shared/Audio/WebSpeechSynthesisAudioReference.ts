import { AudioReference, AudioReferenceEvent } from './AudioReference'

export class WebSpeechSynthesisAudioReference extends EventTarget implements AudioReference {
  speech: SpeechSynthesisUtterance

  constructor(speech: SpeechSynthesisUtterance) {
    super()
    this.speech = speech
    speech.addEventListener('error', (e) => {
      if (e.error === 'interrupted') return
      if (e.error === 'canceled') return
      this.dispatchEvent(new AudioReferenceEvent('error'))
    })
    speech.addEventListener('start', (e) => {
      this.dispatchEvent(new AudioReferenceEvent('playing'))
    })
    speech.addEventListener('end', (e) => {
      this.dispatchEvent(new AudioReferenceEvent('ended'))
    })
  }

  play() {
    speechSynthesis.speak(this.speech)
  }

  pause() {
    speechSynthesis.cancel()
  }
}
