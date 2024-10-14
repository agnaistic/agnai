import { allSockets, sendMany, userSockets } from './redis'
import { AppSocket } from './types'
import { assertValid } from '/common/valid'
import { store } from '/srv/db'
import { verifyJwt } from '/srv/db/user'

export type WebMessage =
  | { type: 'login'; token: string }
  | { type: 'logout' }
  | { type: 'version'; version: number; sha?: string }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'message-ready'; messageId: string; updatedAt?: string }

type Handlers = {
  [key in WebMessage['type']]: (
    client: AppSocket,
    payload: Extract<WebMessage, { type: key }>
  ) => any
}

export const handlers: Handlers = {
  login: (client: AppSocket, data: any) => {
    assertValid({ token: 'string' }, data)
    try {
      if (client.userId) {
        handlers.logout(client, { type: 'logout' })
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
  },
  logout: (client: AppSocket) => {
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
  },
  version: (client, data) => {
    if (isNaN(data.version)) return
    client.appVersion = data.version
    client.sha = data.sha || 'none'
  },
  pong: (client) => {
    client.misses = 0
    client.isAlive = true
  },
  ping: (client) => {
    client.dispatch({ type: 'pong' })
  },
  'message-ready': async (client: AppSocket, data) => {
    const msg = await store.msgs.getMessage(data.messageId)
    if (!msg) {
      return
    }

    // If retrying, ignore the message if it is unchanged
    if (data.updatedAt && msg.updatedAt === data.updatedAt) {
      return
    }

    const chat = await store.chats.getChatOnly(msg.chatId)
    if (!chat) {
      return
    }

    const members = chat.memberIds.concat(client.userId)
    const isChatMember = chat.memberIds.concat(chat.userId).includes(client.userId)
    if (!isChatMember) return

    sendMany(members, {
      type: 'message-completed',
      chatId: msg.chatId,
      generate: true,
      msg,
      retry: !!data.updatedAt,
    })
  },
}
