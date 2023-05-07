type EVENT_NAMES = 'error' | 'playing' | 'ended'

export class AudioReferenceEvent extends Event {
  constructor(type: EVENT_NAMES) {
    super(type)
  }
}

export interface AudioReference extends EventTarget {
  play(): void
  pause(): void
  addEventListener(type: EVENT_NAMES, listener: (e: AudioReferenceEvent) => any): void
}
