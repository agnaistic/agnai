import { EventEmitter } from 'events'

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
}

export const events = new EventEmitter()
