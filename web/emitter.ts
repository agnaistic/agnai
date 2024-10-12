import { EventEmitter } from 'events'
import { send } from './store/create'
import { v4 } from 'uuid'
import { createSignal, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'

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

type FormCallback = (field: string, value: any) => any
type FieldCallback = (value: any) => any

const formCallbacks = new Map<string, FormCallback>()
const fieldCallbacks = new Map<string, Record<string, FieldCallback>>()

export const forms = {
  emit: (field: string, value: any) => {
    for (const callback of formCallbacks.values()) {
      callback(field, value)
    }
  },
  sub: (callback: FormCallback) => {
    const id = v4()

    formCallbacks.set(id, callback)

    return () => formCallbacks.delete(id)
  },
  useSub(callback: FormCallback) {
    const unsub = forms.sub(callback)

    onCleanup(() => {
      unsub()
    })

    return unsub
  },
  fieldSub: <T = any>(field: string) => {
    const [value, setValue] = createSignal<T>(getFormValue(field))
    const id = v4()

    const callbacks = fieldCallbacks.get(field) || {}

    callbacks[id] = setValue

    fieldCallbacks.set(field, callbacks)

    onCleanup(() => {
      const callbacks = fieldCallbacks.get(field) || {}
      delete callbacks[id]
      fieldCallbacks.set(field, callbacks)
    })

    return value
  },
  fields: <T extends string>(fields: T[]): { [key in T]: any } => {
    const [values, setValues] = createStore<{ [key in T]: any }>({} as any)

    for (const field of fields) {
      const name = field as T
      const value = getFormValue(name)
      setValues(name as any, value)
    }

    const set = new Set(fields)

    forms.useSub((field, value) => {
      if (set.has(field as T)) {
        setValues(field as any, value)
      }
    })

    return values
  },
}

export function getFormValue(field: string) {
  const elements: any = document.querySelector('form')?.elements
  if (!elements) return

  const ele = elements[field]
  if (!ele) return

  return ele.value
}
