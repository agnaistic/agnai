import { AudioReference, AudioReferenceEvent } from './AudioReference'

export class UrlAudioReference extends EventTarget implements AudioReference {
  audio: HTMLAudioElement

  constructor(audio: HTMLAudioElement) {
    super()
    this.audio = audio
    audio.addEventListener('error', (e) => {
      this.dispatchEvent(new AudioReferenceEvent('error'))
    })
    audio.addEventListener('playing', (e) => {
      this.dispatchEvent(new AudioReferenceEvent('playing'))
    })
    audio.addEventListener('ended', (e) => {
      this.dispatchEvent(new AudioReferenceEvent('ended'))
    })
  }

  play() {
    this.audio.play()
  }

  pause() {
    this.audio.pause()
  }
}
