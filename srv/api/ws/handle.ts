import { assertValid } from '/common/valid'
import { AppSocket } from './types'
import { verifyJwt } from '/srv/db/user'

const allSockets = new Map<string, AppSocket>()
const userSockets = new Map<string, AppSocket[]>()

type Handler = (client: AppSocket, data: any) => void

const handlers: Record<string, Handler> = {
  login,
  logout,
}

export function getAllCount() {
  return allSockets.size
}

export function handleMessage(client: AppSocket) {
  client.on('message', (data) => {
    const payload = parse(data)
    if (!payload) return
    if (typeof payload !== 'object') return
    if ('type' in payload === false) return

    const handler = handlers[payload.type]
    if (!handler) return

    handler(client, payload)
  })

  client.dispatch = (data) => {
    client.send(JSON.stringify(data))
  }

  client.on('close', () => {
    logout(client)
  })

  client.on('error', () => {
    logout(client)
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

async function login(client: AppSocket, data: any) {
  assertValid({ token: 'string' }, data)
  try {
    if (client.userId) {
      logout(client)
    }

    const payload = verifyJwt(data.token)
    client.token = data.token
    client.userId = payload.userId

    const sockets = userSockets.get(client.userId) || []
    sockets.push(client)
    userSockets.set(client.userId, sockets)
    client.dispatch({ type: 'login', success: true })
  } catch (ex) {
    client.dispatch({ type: 'login', success: false })
  }
}

function logout(client: AppSocket) {
  allSockets.delete(client.uid)
  if (!client.userId) return
  const userId = client.userId
  const sockets = userSockets.get(userId) || []

  client.userId = ''
  client.token = ''

  const next = sockets.filter((s) => s.uid !== client.uid)
  userSockets.set(userId, next)

  if (client.OPEN) {
    client.dispatch({ type: 'logout', success: true })
  }
}

export function publishMany<T extends { type: string }>(userIds: string[], data: T) {
  const unique = Array.from(new Set(userIds))
  for (const userId of unique) {
    publishOne(userId, data)
  }
}

export function publishOne<T extends { type: string }>(userId: string, data: T) {
  let count = 0
  const sockets = userSockets.get(userId)

  if (!sockets) return count

  for (const socket of sockets) {
    socket.send(JSON.stringify(data))
    count++
  }
  return count
}

export function publishAll<T extends { type: string }>(data: T) {
  for (const [, sockets] of userSockets.entries()) {
    for (const socket of sockets) {
      socket.send(JSON.stringify(data))
    }
  }
}

export function publishGuest<T extends { type: string }>(socketId: string, data: T) {
  const socket = allSockets.get(socketId)
  if (!socket) return
  socket.send(JSON.stringify(data))
}
