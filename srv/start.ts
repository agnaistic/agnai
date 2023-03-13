import { initMessageBus } from './api/ws'
import { server } from './app'
import { config } from './config'
import { store } from './db'
import { connect, createIndexes } from './db/client'
import { logger } from './logger'

async function start() {
  await Promise.all([initDb(), initMessageBus()])
  logger.info({ port: config.port }, 'Server started')
}

server.listen(config.port, '0.0.0.0', async () => {
  logger.info({ port: config.port }, 'Server started')
})

// No longer accept requests when shutting down
// Allow as many responses that in generating to complete as possible during the shutdown window
// The shutdown window is ~10 seconds
process.on('SIGTERM', () => {
  logger.warn(`Received SIGTERM. Server shutting down.`)
  server.close()
})

async function initDb() {
  const db = await connect()
  if (db) {
    await createIndexes()
    // Initialise settings if empty
    await store.users.ensureInitialUser()
  }
}

start()
