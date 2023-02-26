import jwt from 'jsonwebtoken'
import { assertValid } from 'frisker'
import { AppSocket } from './types'
import { config } from '../../config'

const users = new Map<string, AppSocket[]>()

type Handler = (client: AppSocket, data: any) => void

const handlers: Record<string, Handler> = {
  login,
}

export function handleMessage(client: AppSocket) {
  client.on('message', (data) => {
    const payload = parse(data)
    if (!payload) return
    if (typeof data !== 'object') return
    if ('type' in payload === false) return

    const handler = handlers[payload.type]
    if (!handler) return

    handler(client, data)
  })

  client.dispatch = (data) => {
    client.send(JSON.stringify(data))
  }
}

function parse(data: any) {
  try {
    const json = JSON.parse(data)
    return json
  } catch (ex) {
    return
  }
}

function login(client: AppSocket, data: any) {
  assertValid({ token: 'string' }, data)
  try {
    const payload = jwt.verify(data.token, config.jwtSecret) as any
    client.token = data.token
    client.userId = payload.userId

    const sockets = users.get(client.userId) || []
    sockets.push(client)
    users.set(client.userId, sockets)
    client.dispatch({ type: 'login', success: true })
  } catch (ex) {
    client.dispatch({ type: 'login', success: false })
  }
}

function logout(client: AppSocket) {
  if (!client.userId) return
  const userId = client.userId
  const sockets = users.get(userId) || []

  client.userId = ''
  client.token = ''

  const next = sockets.filter((s) => s !== client)
  users.set(userId, next)
  client.dispatch({ type: 'logout', success: true })
}
