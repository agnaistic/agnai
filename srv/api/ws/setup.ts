import ws from 'ws'
import { Server } from 'http'
import { AppSocket } from './types'
import { handleMessage } from './message'

export function setupSockets(srv: Server) {
  const sockets = new ws.Server({ server: srv, path: '/ws' })

  sockets.on('connection', (client: AppSocket) => {
    client.userId = ''
    client.isAlive = true

    client.on('pong', heartbeart)
    handleMessage(client)
  })
}

function heartbeart(client: AppSocket) {
  client.isAlive = true
}
