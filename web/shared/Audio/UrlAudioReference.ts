import { AudioReference, AudioReferenceErrorEvent, AudioReferenceEvent } from './AudioReference'

export class UrlAudioReference extends AudioReference {
  audio: HTMLAudioElement

  constructor(audio: HTMLAudioElement) {
    super()
    this.audio = audio
    audio.addEventListener('error', (e) => {
      this.dispatchEvent(
        new AudioReferenceErrorEvent(
          'error',
          e.error ??
            this.audio.error?.message ??
            `Unknown error (code: ${this.audio.error?.code ?? 'unknown'})})`
        )
      )
    })
    audio.addEventListener('playing', () => {
      this.dispatchEvent(new AudioReferenceEvent('playing'))
    })
    audio.addEventListener('ended', () => {
      this.dispatchEvent(new AudioReferenceEvent('ended'))
    })
  }

  override play() {
    this.audio.play()
  }

  override pause() {
    this.audio.pause()
  }
}
