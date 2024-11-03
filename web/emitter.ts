import { EventEmitter } from 'events'
import { send } from './store/create'

export const EVENTS = {
  loggedIn: 'logged-in',
  loggedOut: 'logged-out',
  sessionExpired: 'session-expired',
  init: 'init',
  charsReceived: 'chars-received',
  allChars: 'all-chars-recieved',
  setInputText: 'set-input-text',
  charUpdated: 'character-updated',
  clearMsgs: 'clear-messages',
  receiveMsgs: 'receive-messages',
  charAdded: 'char-added',
  charDeleted: 'char-deleted',
  tierReceived: 'tier-received',
  configUpdated: 'server-config-updated',
  checkoutSuccess: 'checkout-success',
  chatOpened: 'chat-opened',
  chatClosed: 'chat-closed',
} as const

type EventType = (typeof EVENTS)[keyof typeof EVENTS]

const emitter = new EventEmitter()

export const events = {
  emit: (event: EventType, ...args: any[]) => emitter.emit(event, ...args),
  on: (event: EventType, callback: (...args: any[]) => void) => emitter.on(event, callback),
  removeListener: (event: EventType, listener: (...args: any[]) => void) =>
    emitter.removeListener(event, listener),
}

for (const event of Object.values(EVENTS)) {
  emitter.on(event, (...args) => send('[***] emitter', { type: event, args }, undefined))
}
