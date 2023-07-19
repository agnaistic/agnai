import { EventEmitter } from 'events'

export const EVENTS = {
  loggedIn: 'logged-in',
  loggedOut: 'logged-out',
  sessionExpired: 'session-expired',
  init: 'init',
  charsReceived: 'chars-received',
  setInputText: 'set-input-text',
}

export const events = new EventEmitter()
