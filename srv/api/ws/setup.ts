import ws from 'ws'
import { Server } from 'http'
import { AppSocket } from './types'
import { handleMessage } from './message'

/**
 * @TODO - Set up optional message bus
 *
 * These sockets aren't connected to a message bus.
 * Therefore this architecture cannot scale horizontally until there is one in place.
 *
 * A message bus isn't required for self-hosting or small scale hosts.
 *
 * However a 'production grade' deployment would require something like Redis to handle
 * sockets distributed across several hosts or processes.
 */

export function setupSockets(srv: Server) {
  const sockets = new ws.Server({ noServer: true, clientTracking: false })

  srv.on('upgrade', (req, socket, head) => {
    sockets.handleUpgrade(req, socket, head, (client) => {
      sockets.emit('connection', client, req)
    })
  })

  sockets.on('connection', (client: AppSocket) => {
    client.userId = ''
    client.token = ''
    client.isAlive = true

    client.on('pong', heartbeart)
    handleMessage(client)
  })
}

function heartbeart(client: AppSocket) {
  client.isAlive = true
}
