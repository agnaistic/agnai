import { EventEmitter } from 'events'
// import { send } from './store/create'

export const EVENTS = {
  loggedIn: 'logged-in',
  loggedOut: 'logged-out',
  sessionExpired: 'session-expired',
  init: 'init',
  setInputText: 'set-input-text',

  clearMsgs: 'clear-messages',
  receiveMsgs: 'receive-messages',

  allChats: 'all-chats-received',
  chatOpened: 'chat-opened',
  chatClosed: 'chat-closed',
  chatUpdated: 'chat-updated',

  allChars: 'all-chars-recieved',
  charsReceived: 'chars-received',
  charAdded: 'char-added',
  charDeleted: 'char-deleted',

  // Notify the character store that a character was updated
  charUpdated: 'character-updated',

  tierReceived: 'tier-received',
  configUpdated: 'server-config-updated',
  checkoutSuccess: 'checkout-success',
  userBanned: 'user-banned',
  msgAttachment: 'msg-attachment',
  setWaiting: 'set-waiting',
} as const

type EventType = (typeof EVENTS)[keyof typeof EVENTS]

const emitter = new EventEmitter()

export const events = {
  emit: (event: EventType, ...args: any[]) => {
    setTimeout(() => {
      emitter.emit(event, ...args)
    })
  },
  on: (event: EventType, callback: (...args: any[]) => void) => emitter.on(event, callback),
  removeListener: (event: EventType, listener: (...args: any[]) => void) =>
    emitter.removeListener(event, listener),
}

// for (const event of Object.values(EVENTS)) {
//   emitter.on(event, (...args) => send('[***] emitter', { type: event, args }, undefined))
// }
