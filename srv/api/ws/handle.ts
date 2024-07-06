import { AppSocket } from './types'
import { handlers, WebMessage } from './handlers'
import { allSockets } from './bus'

export function handleMessage(client: AppSocket) {
  client.on('message', (data) => {
    const payload = parse(data) as WebMessage
    if (!payload) return
    if (typeof payload !== 'object') return
    if ('type' in payload === false) return

    const handler = handlers[payload.type]
    if (!handler) return

    handler(client, payload as any)
  })

  client.dispatch = (data) => {
    client.send(JSON.stringify(data))
  }

  client.on('close', () => {
    handlers.logout(client, { type: 'logout' })
  })

  client.on('error', () => {
    handlers.logout(client, { type: 'logout' })
  })

  client.on('ping', () => {
    client.send('pong')
  })

  allSockets.set(client.uid, client)
}

function parse(data: any) {
  try {
    const json = JSON.parse(data)
    return json
  } catch (ex) {
    return
  }
}

export function publishMany<T extends { type: string }>(userIds: string[], data: T) {}

export function publishOne<T extends { type: string }>(userId: string, data: T) {}

export function publishAll<T extends { type: string }>(data: T) {}

export function publishGuest<T extends { type: string }>(socketId: string, data: T) {}
