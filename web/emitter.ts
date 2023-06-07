import { EventEmitter } from 'events'

export const EVENTS = {
  loggedIn: 'logged-in',
  loggedOut: 'logged-out',
  sessionExpired: 'session-expired',
  init: 'init',
  charsLoaded: 'chars-loaded',
}

export const events = new EventEmitter()
