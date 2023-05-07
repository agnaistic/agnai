import { AudioReference, AudioReferenceEvent } from './AudioReference'

export class WebSpeechSynthesisAudioReference extends EventTarget implements AudioReference {
  speech: SpeechSynthesisUtterance

  constructor(speech: SpeechSynthesisUtterance) {
    super()
    this.speech = speech
  }

  play() {
    speechSynthesis.speak(this.speech)
    this.dispatchEvent(new AudioReferenceEvent('playing'))
  }

  pause() {
    speechSynthesis.cancel()
    this.dispatchEvent(new AudioReferenceEvent('ended'))
  }
}
