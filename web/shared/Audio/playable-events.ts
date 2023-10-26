import { TypedEventEmitter, TypedEventMap } from 'common/typed-event-emitter'

interface PlayableEvent extends TypedEventMap {
  'menu-item-clicked': 'login' | 'user' | 'profile' | 'characters' | 'chats' | 'library' | 'presets'
}

class SoundEmitter extends TypedEventEmitter<PlayableEvent> {}

export const soundEmitter = new SoundEmitter()
