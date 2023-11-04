import { TypedEventEmitter, TypedEventMap } from 'common/typed-event-emitter'

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

class SoundEmitter extends TypedEventEmitter<PlayableEvent> {}

export const soundEmitter = new SoundEmitter()
