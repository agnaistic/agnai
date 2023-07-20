export class AudioReferenceEvent extends Event {
  constructor(type: 'playing' | 'ended') {
    super(type)
  }
}

export class AudioReferenceErrorEvent extends ErrorEvent {
  constructor(type: 'error', message: string) {
    super(type, { message })
  }
}

interface AudioReferenceEventMap extends GlobalEventHandlersEventMap {
  playing: AudioReferenceEvent
  ended: AudioReferenceEvent
  error: AudioReferenceErrorEvent
}

type AudioRefOpts = { audio: HTMLAudioElement } | { speech: SpeechSynthesisUtterance }

export class AudioReference extends EventTarget {
  constructor(public opts: AudioRefOpts) {
    super()

    if ('audio' in opts) {
      this.handleUrlSpeech(opts.audio)
    } else {
      this.handleWebSpeech(opts.speech)
    }
  }

  handleUrlSpeech(audio: HTMLAudioElement) {
    audio.addEventListener('error', (e) => {
      this.dispatchEvent(
        new AudioReferenceErrorEvent(
          'error',
          e.error ??
            audio.error?.message ??
            `Unknown error (code: ${audio.error?.code ?? 'unknown'})})`
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

  handleWebSpeech(speech: SpeechSynthesisUtterance) {
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

  play = () => {
    if ('audio' in this.opts) {
      this.opts.audio.play()
    } else {
      speechSynthesis.speak(this.opts.speech)
    }
  }

  pause = () => {
    if ('audio' in this.opts) {
      this.opts.audio.pause()
    } else {
      speechSynthesis.pause()
    }
  }

  addEventListener<K extends keyof AudioReferenceEventMap>(
    type: K,
    listener: (this: AudioReference, ev: AudioReferenceEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    super.addEventListener(type, listener)
  }
}
