import * as redis from 'redis'
import { config } from '../../config'
import { logger } from '../../logger'
import { publishAll, publishGuest, publishMany, publishOne } from './handle'

let connected = false

const MESSAGE_EVENT = 'agnaistic-message'

export const clients = {
  pub: redis.createClient({ url: getUri() }),
  sub: redis.createClient({ url: getUri() }),
}

export function isConnected() {
  return connected
}

export async function initMessageBus() {
  try {
    await clients.pub.connect()
    await clients.sub.connect()
    logger.info('Connected to message bus')

    clients.sub.subscribe(MESSAGE_EVENT, async (msg, _channel) => {
      try {
        const json = JSON.parse(msg) as BusMessage
        if (!json.target) return
        handleBus(json)
      } catch (ex) {}
    })
    connected = true
  } catch (ex) {
    logger.warn({ err: ex }, `Message bus not connected - Running in non-distributed mode`)
  }
}

function getUri() {
  let creds = config.redis.user || ''
  if (creds && config.redis.pass) creds += `:${config.redis.pass}`
  if (creds) creds += '@'

  return `redis://${creds}${config.redis.host}:${config.redis.port}`
}

type BusMessage<T extends { type: string } = { type: string }> =
  | { target: 'one'; userId: string; data: T }
  | { target: 'many'; userIds: string[]; data: T }
  | { target: 'guest'; socketId: string; data: T }
  | { target: 'all'; data: any }

function handleBus(msg: BusMessage) {
  try {
    switch (msg.target) {
      case 'one':
        return publishOne(msg.userId, msg.data)

      case 'many':
        return publishMany(msg.userIds, msg.data)

      case 'all':
        return publishAll(msg.data)

      case 'guest':
        return publishGuest(msg.socketId, msg.data)
    }
  } catch (ex) {}
}

export async function broadcast(payload: BusMessage) {
  if (connected) {
    await clients.pub.publish(MESSAGE_EVENT, JSON.stringify(payload))
    return
  }

  handleBus(payload)
}

export async function sendMany<T extends { type: string }>(userIds: string[], data: T) {
  await broadcast({ target: 'many', userIds, data })
}

export async function sendOne<T extends { type: string }>(userId: string, data: T) {
  await broadcast({ target: 'one', userId, data })
}

export async function sendAll<T extends { type: string }>(data: T) {
  await broadcast({ target: 'all', data })
}

export async function sendGuest<T extends { type: string }>(socketId: string, data: T) {
  await broadcast({ target: 'guest', socketId, data })
}
