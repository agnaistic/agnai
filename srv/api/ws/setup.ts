import ws from 'ws'
import { Server } from 'http'
import { AppSocket } from './types'
import { handleMessage } from './handle'
import { v4 } from 'uuid'

export function setupSockets(srv: Server) {
  const sockets = new ws.Server({ noServer: true, clientTracking: false })

  srv.on('upgrade', (req, socket, head) => {
    sockets.handleUpgrade(req, socket, head, (client) => {
      sockets.emit('connection', client, req)
    })
  })

  sockets.on('connection', (client: AppSocket) => {
    client.uid = v4()
    client.userId = ''
    client.token = ''
    client.isAlive = true

    client.send(JSON.stringify({ type: 'connected', uid: client.uid }))
    client.on('pong', heartbeart)
    handleMessage(client)
  })
}

function heartbeart(client: AppSocket) {
  client.isAlive = true
}
