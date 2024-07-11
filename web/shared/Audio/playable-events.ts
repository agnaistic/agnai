import { TypedEventEmitter, TypedEventMap } from '/common/typed-event-emitter'

export interface PlayableEvent extends TypedEventMap {
  'menu-item-clicked':
    | 'login'
    | 'user'
    | 'profile'
    | 'characters'
    | 'chats'
    | 'library'
    | 'presets'
    | 'sounds'
}

export const soundEmitter = new TypedEventEmitter<PlayableEvent>()
