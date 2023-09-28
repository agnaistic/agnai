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
}

export const events = new EventEmitter()

for (const event of Object.values(EVENTS)) {
  events.on(event, () => send('[***] emitter', { type: event }, undefined))
}
