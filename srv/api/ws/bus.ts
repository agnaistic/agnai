import * as os from 'os'
import * as redis from 'redis'
import { config } from '../../config'
import { logger } from '../../logger'
import { getAllCount, publishAll, publishGuest, publishMany, publishOne } from './handle'

let connected = false

type LiveCount = {
  count: number
  hostname: string
  date: Date
}

let liveCounts: Record<string, LiveCount> = {}

const MESSAGE_EVENT = 'agnaistic-message'
const COUNT_EVENT = 'agnaistic-users'

export const clients = {
  pub: redis.createClient({ url: getUri() }),
  sub: redis.createClient({ url: getUri() }),
}

export function getLiveCounts() {
  if (!connected) return [{ hostname: os.hostname(), count: getAllCount(), date: new Date() }]

  const entries: LiveCount[] = []
  const now = Date.now()
  for (const [hostname, entry] of Object.entries(liveCounts)) {
    const diff = now - entry.date.valueOf()
    if (diff > 15000) continue
    entries.push(entry)
  }

  return entries
}

export function isConnected() {
  return connected
}

export async function initMessageBus() {
  if (!config.redis.host) {
    logger.info(
      `No Redis host provided - Running in non-distributed mode. If you are self-hosting you can ignore this warning.`
    )
    return
  }

  try {
    await clients.pub.connect()
    await clients.sub.connect()
    logger.info('Connected to message bus')

    setInterval(() => {
      clients.pub.publish(
        COUNT_EVENT,
        JSON.stringify({ count: getAllCount(), hostname: os.hostname() })
      )
    }, 10000)

    clients.sub.subscribe(COUNT_EVENT, (msg) => {
      try {
        const json = JSON.parse(msg)
        liveCounts[json.hostname] = { ...json, date: new Date() }
      } catch (ex) {}
    })

    clients.sub.subscribe(MESSAGE_EVENT, async (msg, _channel) => {
      try {
        const json = JSON.parse(msg) as BusMessage
        if (!json.target) return
        handleBus(json)
      } catch (ex) {}
    })

    connected = true
  } catch (ex) {
    logger.warn(
      `Message bus not connected - Running in non-distributed mode. If you are self-hosting you can ignore this warning.`
    )
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
