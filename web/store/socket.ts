import { UnwrapBody, Validator, isValid } from '/common/valid'
import { baseUrl, getAuth, setSocketId } from './api'

type Handler = { validator: Validator; fn: (body: any) => void }

const listeners = new Map<string, Handler[]>()
const onceListeners = new Map<string, Array<Handler & { predicate: (body: any) => boolean }>>()

const BASE_RETRY = 100
const MAX_RETRY = 1000
let RETRY_TIME = 0

let socket: WebSocket

createSocket()

function createSocket() {
  const socketUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')
  const ws = new WebSocket(socketUrl)

  socket = ws
  ws.onopen = onConnected
  ws.onmessage = onMessage
  ws.onclose = onClose
}

export function publish<T extends { type: string }>(payload: T) {
  const isAuthed = getAuth()
  if (!isAuthed) return

  socket.send(JSON.stringify(payload))
}

export function subscribe<T extends string, U extends Validator>(
  type: string,
  validator: U,
  handler: (body: UnwrapBody<U> & { type: T }) => void,
  once?: (body: UnwrapBody<U> & { type: T }) => boolean
) {
  if (once) {
    const handlers = onceListeners.get(type) || []
    handlers.push({ validator, fn: handler, predicate: once })
    onceListeners.set(type, handlers)
    return
  }
  const handlers = listeners.get(type) || []
  handlers.push({ validator, fn: handler })
  listeners.set(type, handlers)
}

const squelched = new Set(['profile-handle-changed', 'message-partial'])

function onMessage(msg: MessageEvent<any>) {
  if (typeof msg.data !== 'string') return

  const blobs = msg.data.split('\n')
  for (const blob of blobs) {
    const payload = parse(blob)
    if (!payload) continue

    if (!payload.type) continue
    const handlers = listeners.get(payload.type) || []
    const onceHandlers = onceListeners.get(payload.type) || []

    if (!squelched.has(payload.type)) {
      if (payload.type !== 'image-generated') {
        console.log(JSON.stringify(payload))
      } else {
        console.log(
          JSON.stringify({ ...payload, image: (payload.image || '').slice(0, 40) + '...' })
        )
      }
    } else {
      // console.log(payload.type, '...')
    }

    for (const handler of handlers) {
      if (!isValid(handler.validator, payload)) continue
      handler.fn(payload)
    }

    for (const handler of onceHandlers) {
      if (!isValid(handler.validator, payload)) continue
      if (!handler.predicate(payload)) continue

      handler.fn(payload)
      const i = onceHandlers.findIndex((h) => h === handler)
      onceHandlers.splice(i, 1)
    }

    onceListeners.set(payload.type, onceHandlers)
  }
}

function onConnected() {
  RETRY_TIME = 0
  const token = getAuth()
  if (!token) return
  publish({ type: 'login', token })
}

function onClose() {
  RETRY_TIME = RETRY_TIME === 0 ? BASE_RETRY : RETRY_TIME * 2
  if (RETRY_TIME > MAX_RETRY) RETRY_TIME = MAX_RETRY

  setTimeout(() => {
    createSocket()
  }, RETRY_TIME)
}

function parse(blob: string) {
  try {
    const data = JSON.parse(blob)
    return data
  } catch (ex) {}
}

subscribe('connected', { uid: 'string' }, (body) => {
  setSocketId(body.uid)
})
