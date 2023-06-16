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
  max: number
}

let liveCounts: Record<string, LiveCount> = {}

const MESSAGE_EVENT = 'agnaistic-message'
const COUNT_EVENT = 'agnaistic-users'

export const clients = {
  pub: redis.createClient({ url: getUri() }),
  sub: redis.createClient({ url: getUri() }),
}

let nonBusMaxCount = 0

export function getLiveCounts() {
  if (!connected)
    return {
      entries: [
        {
          hostname: `${os.hostname()}-${process.pid}`,
          count: getAllCount(),
          date: new Date(),
          max: nonBusMaxCount,
        },
      ],
      maxLiveCount: nonBusMaxCount,
    }

  const entries: LiveCount[] = []
  const now = Date.now()
  let maxLiveCount = 0
  for (const [_, entry] of Object.entries(liveCounts)) {
    const diff = now - entry.date.valueOf()
    if (diff > 15000) continue
    maxLiveCount += entry.max
    entries.push(entry)
  }

  return { entries, maxLiveCount }
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
    handleErrors()

    setInterval(() => {
      const count = getAllCount()
      clients.pub.publish(
        COUNT_EVENT,
        JSON.stringify({ count, hostname: `${os.hostname()}-${process.pid}` })
      )
    }, 2000)

    clients.sub.subscribe(COUNT_EVENT, (msg) => {
      try {
        const json = JSON.parse(msg)
        const prevMax = liveCounts[json.hostname]?.max ?? 0
        const max = Math.max(prevMax, json.count)
        liveCounts[json.hostname] = { ...json, max, date: new Date() }
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
    setInterval(() => {
      nonBusMaxCount = Math.max(getAllCount(), nonBusMaxCount)
    }, 5000)
    logger.warn(
      `Message bus not connected - Running in non-distributed mode. If you are self-hosting you can ignore this warning.`
    )
  }
}

function handleErrors() {
  clients.pub.on('error', (error) => {})

  clients.sub.on('error', (error) => {})
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
