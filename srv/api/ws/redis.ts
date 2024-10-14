import * as os from 'os'
import * as redis from 'redis'
import { config } from '../../config'
import { logger } from '../../middleware'
import { AppSocket } from './types'
import { PING_INTERVAL_MS } from '/common/util'

export const allSockets = new Map<string, AppSocket>()
export const userSockets = new Map<string, AppSocket[]>()

setInterval(() => {
  for (const cli of allSockets.values()) {
    const socket = cli as AppSocket
    if (cli.appVersion >= 1 === false) continue

    if (socket.isAlive === false) {
      socket.misses++

      if (socket.misses >= 5) {
        return socket.terminate()
      }
    }

    socket.isAlive = false
    socket.dispatch({ type: 'ping' })
  }
}, PING_INTERVAL_MS)

let CONNECTED = false

type LiveCount = {
  count: number
  shas: Record<string, number>
  versioned: number
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

  bpub: redis.createClient({ url: getBroadcastUri() }),
  bsub: redis.createClient({ url: getBroadcastUri() }),
}

let nonBusMaxCount = 0

export function getAllCount() {
  let versioned = 0
  const shas: Record<string, number> = {}
  for (const cli of allSockets.values()) {
    const sha = cli.sha || 'none'
    if (!shas[sha]) shas[sha] = 0
    shas[sha]++
    if (cli.appVersion > 0) {
      versioned++
    }
  }

  return { count: allSockets.size, versioned, shas }
}

export function getLiveCounts() {
  if (!CONNECTED)
    return {
      entries: [
        {
          hostname: `${os.hostname()}-${process.pid}`,
          ...getAllCount(),
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
  return CONNECTED
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
        JSON.stringify({ ...count, hostname: `${os.hostname()}-${process.pid}` })
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

    CONNECTED = true
  } catch (ex) {
    setInterval(() => {
      nonBusMaxCount = Math.max(getAllCount().count, nonBusMaxCount)
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

function getBroadcastUri() {
  let creds = config.broadcast.user || ''
  if (creds && config.broadcast.pass) creds += `:${config.broadcast.pass}`
  if (creds) creds += '@'

  return `redis://${creds}${config.broadcast.host}:${config.broadcast.port}`
}

type BusMessage<T extends { type: string } = { type: string }> =
  | { target: 'one'; userId: string; data: T }
  | { target: 'many'; userIds: string[]; data: T }
  | { target: 'guest'; socketId: string; data: T }
  | { target: 'all'; data: any }

function handleBus(msg: BusMessage) {
  try {
    switch (msg.target) {
      case 'one': {
        let count = 0
        const sockets = userSockets.get(msg.userId)

        if (!sockets) return count

        for (const socket of sockets) {
          socket.send(JSON.stringify(msg.data))
          count++
        }
        return count
      }

      case 'many': {
        const unique = Array.from(new Set(msg.userIds))
        for (const userId of unique) {
          handleBus({ target: 'one', userId, data: msg.data })
        }
        return
      }

      case 'all': {
        for (const [, socket] of allSockets.entries()) {
          if (!socket) continue
          socket.send(JSON.stringify(msg.data))
        }
        return
      }

      case 'guest': {
        const socket = allSockets.get(msg.socketId)
        if (!socket) return
        socket.send(JSON.stringify(msg.data))
        return
      }
    }
  } catch (ex) {}
}

export async function broadcast(payload: BusMessage) {
  if (CONNECTED) {
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
