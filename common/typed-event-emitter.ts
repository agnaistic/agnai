import EventEmitter from 'events'

export type TypedEventMap = Record<string, any>

type TypedEventKey<T extends TypedEventMap> = string & keyof T

type TypedEventArgs<T extends TypedEventMap, K extends TypedEventKey<T>> = T[K]

type TypedEventListener<T extends TypedEventMap, K extends TypedEventKey<T>> = (
  args: TypedEventArgs<T, K>
) => void

type GlobalEventListener<T extends TypedEventMap> = (
  eventName: TypedEventKey<T>,
  args: T[keyof T]
) => void

export abstract class TypedEventEmitter<T extends TypedEventMap> {
  private internal = new EventEmitter()
  private global: GlobalEventListener<T> | null = null

  setGlobalEventListener(listener: GlobalEventListener<T>) {
    this.global = listener
  }

  clearGlobalEventListener() {
    this.global = null
  }

  addListener<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.addListener(eventName, listener)
  }

  removeListener<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.removeListener(eventName, listener)
  }

  removeAllListeners<K extends TypedEventKey<T>>(event?: K) {
    this.internal.removeAllListeners(event)
  }

  on<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.on(eventName, listener)
  }

  off<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.off(eventName, listener)
  }

  emit<K extends TypedEventKey<T>>(eventName: K, args: T[K]) {
    this.internal.emit(eventName, args)
    if (this.global) this.global(eventName, args)
  }
}
