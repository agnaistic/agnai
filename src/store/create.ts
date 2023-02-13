import { createStore as create, StoreApi } from 'zustand/vanilla'

type ReducerReturn<S> =
  | MaybeState<S>
  | Promise<MaybeState<S>>
  | AsyncGenerator<MaybeState<S>, MaybeState<S>>
  | Generator<MaybeState<S>, MaybeState<S>>

type MaybeState<S> = Partial<S> | void

export type Dispatcher<A extends { type: string }> = (action: A) => void

type ReducerBody<S, A extends { type: string }> = {
  [Type in A['type']]?: (
    state: S,
    action: Extract<A, { type: Type }>,
    dispatch: Dispatcher<A>
  ) => ReducerReturn<S>
}

type SetterFunction<S> = (state: S, ...args: any[]) => ReducerReturn<S>

type InitAction = { type: '__INIT' }

type BaseAction<T extends { type: string }> = T | InitAction

type Setter<S> = (state: S) => void

const win: any = window
const devTools = win.__REDUX_DEVTOOLS_EXTENSION__?.connect?.() || {
  send: () => {},
}

const stores: { [name: string]: StoreApi<any> } = {}

function send(name: string, action: any, state: any) {
  const print = name

  if (name.startsWith('[ IN]') || name.startsWith('[OUT]')) {
    name = name.slice(6)
  }

  if (action.type === '__INIT') return
  let next: any = {}

  for (const [name, store] of Object.entries(stores)) {
    next[name] = store.getState()
  }

  next[name] = state
  devTools.send({ ...action, type: `${print.padEnd(15, '.')}.${action.type}` }, next)
}

type HandlerArgs<T> = T extends (first: any, ...args: infer U) => any ? U : never

type StateSetter<S> = (next: Partial<S>) => void

export function createStore<State extends {}>(name: string, init: State) {
  let setter: any
  let getter: any

  const store = create<State>((set, get) => {
    setter = set
    getter = get

    return { ...init }
  })

  stores[name] = store

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

    const rawHandlers = handlers(getter, wrappedSetter)

    for (const [key, handler] of Object.entries(rawHandlers) as Array<[keyof Handler, any]>) {
      wrapped[key] = async (...args: any[]) => {
        const prev = getter()
        const result = handler(getter(), ...args)
        send(`[ IN] ${name}`, { type: key, args }, prev)
        if (!result) return

        if (isPromise<State>(result)) {
          const nextState = await result
          const next = { ...prev, ...nextState }
          send(`[OUT] ${name}`, { type: key, args }, next)
          setter(next)
          return
        }

        if (isGenerator<State>(result)) {
          let next = { ...prev }

          do {
            const { done, value: nextState } = await result.next()
            if (done === undefined) return
            if (!nextState) return
            next = { ...next, ...nextState }
            send(`[OUT] ${name}`, { type: key, args }, next)
            setter(next)
            if (done) return
          } while (true)
        }

        const next = { ...prev, ...result }
        send(`[OUT] ${name}`, { type: key, args }, next)
        setter(next)
      }
    }

    type Wrapped = {
      [key in keyof Handler]: (...args: HandlerArgs<Handler[key]>) => void
    }

    type PatchedStore = typeof store & Wrapped
    const patchedStore = store as PatchedStore

    for (const key of Object.keys(wrapped) as Array<keyof Handler>) {
      patchedStore[key] = wrapped[key] as any
    }

    stores[name] = patchedStore

    return patchedStore
  }

  send(`[ IN] ${name}`, { type: 'INIT' }, init)
  return setup
}

export function createReducerStore<State, Action extends { type: string }>(
  name: string,
  init: State,
  reducers: ReducerBody<State, BaseAction<Action>>
) {
  const listeners: Array<{ type: string; callback: any }> = []
  const reducer = async (
    state: State = init,
    action: Action | InitAction,
    dispatch: Dispatcher<BaseAction<Action>>,
    setter: Setter<State>
  ) => {
    if (!action) return state

    const type = action.type as BaseAction<Action>['type']
    const handler = reducers[type]
    send(`[ IN] ${name}`, action, state)
    if (!handler) {
      return
    }

    const result = handler(state, action as any, dispatch)
    if (!result) return state

    if (isPromise<State>(result)) {
      const nextState = await result
      const next = { ...state, ...nextState }
      send(`[OUT] ${name}`, action, state)
      setter(next)
      return
    }

    if (isGenerator<State>(result)) {
      let next = { ...state }

      do {
        const { done, value: nextState } = await result.next()
        if (done === undefined) return
        if (!nextState) return
        next = { ...next, ...nextState }
        send(`[OUT] ${name}`, action, state)
        setter(next)
        if (done) return
      } while (true)
    }

    const next = { ...state, ...result }
    send(`[OUT] ${name}`, action, state)
    setter(next)
  }

  const store = create<State & { dispatch: Dispatcher<Action> }>((set, get) => {
    const dispatch = async (action: BaseAction<Action>) => {
      const next = await reducer(get(), action, dispatch, set as any)

      for (const listener of listeners) {
        if (listener.type === action.type) listener.callback(action)
      }

      return next
    }

    dispatch({ type: '__INIT' })

    return {
      ...init,
      dispatch,
    }
  })

  type PatchedStore = typeof store & {
    dispatch: Dispatcher<Action>
    listen: <T extends Action['type']>(
      type: T,
      callback: (action: Extract<Action, { type: T }>) => any
    ) => void
  }

  const patchedStore = store as PatchedStore
  patchedStore.dispatch = store.getState().dispatch
  patchedStore.listen = (type, callback) => {
    listeners.push({ type, callback })
  }

  stores[name] = store

  send(`[ IN] ${name}`, { type: 'INIT' }, init)
  return patchedStore
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
