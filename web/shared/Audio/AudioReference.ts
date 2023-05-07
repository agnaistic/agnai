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

export abstract class AudioReference extends EventTarget {
  abstract play(): void
  abstract pause(): void
  addEventListener<K extends keyof AudioReferenceEventMap>(
    type: K,
    listener: (this: AudioReference, ev: AudioReferenceEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener, options)
  }
}
