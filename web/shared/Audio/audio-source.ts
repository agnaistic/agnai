import { RemoteAudio, RemoteAudioOpts, createRemoteAudio } from './remote-speech'
import { NativeSpeech, NativeSpeechOpts, createNativeSpeech } from './native-speech'

export class AudioSourceEvent extends Event {
  constructor(type: 'playing' | 'ended') {
    super(type)
  }
}

export class AudioSourceErrorEvent extends ErrorEvent {
  constructor(type: 'error', message: string) {
    super(type, { message })
  }
}

interface AudioSourceEventMap extends GlobalEventHandlersEventMap {
  playing: AudioSourceEvent
  ended: AudioSourceEvent
  error: AudioSourceErrorEvent
}

export class AudioSource extends EventTarget {
  source!: RemoteAudio | NativeSpeech

  private constructor() {
    super()
  }

  public static async create(opts: RemoteAudioOpts | NativeSpeechOpts) {
    const audioSrc: AudioSource = new AudioSource()

    const onplaying = () => audioSrc.dispatchEvent(new AudioSourceEvent('playing'))
    const onended = () => audioSrc.dispatchEvent(new AudioSourceEvent('ended'))
    const onerror = (msg: string) => audioSrc.dispatchEvent(new AudioSourceErrorEvent('error', msg))

    switch (opts.kind) {
      case 'remote':
        let audio = createRemoteAudio(opts, onplaying, onended, onerror)
        audioSrc.source = audio
        break
      case 'native':
        let speech = createNativeSpeech(opts, onplaying, onended, onerror)
        audioSrc.source = speech
        break
    }

    return audioSrc
  }

  play = async (rate?: number) => {
    await this.source.play(rate)
  }

  stop = async () => {
    await this.source.stop()
  }

  addEventListener<K extends keyof AudioSourceEventMap>(
    type: K,
    listener: (this: AudioSource, ev: AudioSourceEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    super.addEventListener(type, listener)
  }
}
