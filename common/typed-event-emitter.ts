import EventEmitter from 'events'

export type TypedEventMap = Record<string, any>

type TypedEventKey<T extends TypedEventMap> = string & keyof T

type TypedEventArgs<T extends TypedEventMap, K extends TypedEventKey<T>> = T[K]

type TypedEventListener<T extends TypedEventMap, K extends TypedEventKey<T>> = (
  args: TypedEventArgs<T, K>
) => void

export abstract class TypedEventEmitter<T extends TypedEventMap> {
  private internal = new EventEmitter()

  addListener<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.addListener(eventName, listener)
  }

  removeListener<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.removeListener(eventName, listener)
  }

  on<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.on(eventName, listener)
  }

  off<K extends TypedEventKey<T>>(eventName: K, listener: TypedEventListener<T, K>) {
    this.internal.off(eventName, listener)
  }

  emit<K extends TypedEventKey<T>>(eventName: K, args: T[K]) {
    this.internal.emit(eventName, args)
  }
}
