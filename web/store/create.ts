import create, { StoreApi } from 'zustand/vanilla'
import * as solidstore from 'solid-js/store'
import { onCleanup } from 'solid-js'
import type { userStore } from './user'
import type { chatStore } from './chat'
import type { toastStore } from './toasts'
import type { characterStore } from './character'
import type { inviteStore } from './invites'
import type { settingStore } from './settings'
import type { memoryStore } from './memory'
import type { msgStore } from './message'
import type { adminStore } from './admin'
import type { presetStore } from './presets'
import type { scenarioStore } from './scenario'
import type { audioStore } from './audio'

type StoreMap = {
  user: typeof userStore
  chat: typeof chatStore
  toasts: typeof toastStore
  character: typeof characterStore
  invite: typeof inviteStore
  settings: typeof settingStore
  memory: typeof memoryStore
  messages: typeof msgStore
  admin: typeof adminStore
  presets: typeof presetStore
  scenario: typeof scenarioStore
  audio: typeof audioStore
}

type HandlerReturn<S> =
  | MaybeState<S>
  | Promise<MaybeState<S>>
  | AsyncGenerator<MaybeState<S>, MaybeState<S>>
  | Generator<MaybeState<S>, MaybeState<S>>
  | Promise<MaybeState<S>>

type MaybeState<S> = Partial<S> | void

type SetterFunction<S> = (state: S, ...args: any[]) => HandlerReturn<S>

const win: any = window
const devTools = win.__REDUX_DEVTOOLS_EXTENSION__?.connect?.() || {
  send: () => {},
}

type CachedStore = (() => any) & StoreApi<any>

const stores: { [name: string]: CachedStore } = {}

export function getStore<TKey extends keyof StoreMap>(name: TKey): StoreMap[TKey] {
  return stores[name] as any
}

let lastState: any
export function send(name: string, action: any, state: any) {
  if (state) {
    lastState = state
  }

  state = state || lastState
  const print = name

  if (name.startsWith('[ IN]') || name.startsWith('[OUT]')) {
    name = name.slice(6)
  }

  if (action.type === '__INIT') return
  let next: any = {}

  for (const [name, store] of Object.entries(stores)) {
    next[name] = store.getState()
  }

  if (name in next) {
    next[name] = state
  }
  devTools.send({ ...action, type: `${print.padEnd(15, '.')}.${action.type}` }, next)
}

type HandlerArgs<T> = T extends (first: any, ...args: infer U) => any ? U : never

type StateSetter<S> = (next: Partial<S>) => Promise<void>

export function createStore<State extends {}>(name: string, init: State) {
  let setter: any
  let getter: any

  const store = create<State>((set, get) => {
    setter = set
    getter = get

    return { ...init }
  })

  const setup = <Handler extends { [key: string]: SetterFunction<State> }>(
    handlers: (getState: () => State, setState: StateSetter<State>) => Handler
  ) => {
    let wrapped: {
      [key in keyof Handler]: (...args: HandlerArgs<Handler[key]>) => void
    } = {} as any

    const wrappedSetter = (next: any) => {
      if (!next) return
      send(`[OUT] ${name}`, { type: 'setter' }, { ...getter(), ...next })
      setter(next)
    }

    const rawHandlers = handlers(getter, wrappedSetter as any)

    for (const [key, handler] of Object.entries(rawHandlers) as Array<[keyof Handler, any]>) {
      wrapped[key] = async (...args: any[]) => {
        const prev = getter()
        const result = handler(getter(), ...args)
        send(`[ IN] ${name}`, { type: key, args }, prev)
        if (!result) return

        if (isPromise<State>(result)) {
          const nextState = await result.catch(() => null)
          if (!nextState) return
          const next = { ...getter(), ...nextState }
          send(`[OUT] ${name}`, { type: key, args }, next)
          setter(next)
          return
        }

        if (isGenerator<State>(result)) {
          // let next = { ...getter() }

          do {
            const { done, value: nextState } = await result.next()
            if (done === undefined) return
            if (!nextState) return
            const next = { ...getter(), ...nextState }
            send(`[OUT] ${name}`, { type: key, args }, next)
            setter(next)
            if (done) return
          } while (true)
        }

        const next = { ...getter(), ...result }
        send(`[OUT] ${name}`, { type: key, args }, next)
        setter(next)
      }
    }

    type Wrapped = {
      [key in keyof Handler]: (...args: HandlerArgs<Handler[key]>) => Promise<void>
    }

    const useStore = <T = State>(selector?: (state: State) => T) => {
      const init = selector ? selector(store.getState()) : store.getState()
      const [solid, setSolid] = solidstore.createStore(init as any)

      const unsub = store.subscribe((next) => {
        const nextState = selector ? selector(next) : next
        setSolid(nextState as any)
      })

      onCleanup(unsub)
      return solid as T
    }

    type PatchedStore = typeof useStore & Wrapped & typeof store
    const patchedStore = useStore as PatchedStore
    Object.assign(patchedStore, store)

    for (const key of Object.keys(wrapped) as Array<keyof Handler>) {
      patchedStore[key] = wrapped[key] as any
    }

    stores[name] = patchedStore

    return patchedStore
  }

  send(`[ IN] ${name}`, { type: 'INIT' }, init)
  return setup
}

function isPromise<S>(value: any): value is Promise<Partial<S> | void> {
  if (!value) return false
  return 'then' in value && typeof value.then === 'function'
}

function isGenerator<S>(
  value: any
): value is
  | AsyncGenerator<Partial<S> | void, Partial<S> | void>
  | Generator<Partial<S>, Partial<S> | void> {
  if (!value) return false
  return 'next' in value && typeof value.next === 'function'
}
