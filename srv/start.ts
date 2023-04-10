import { initMessageBus } from './api/ws'
import { server } from './app'
import { config } from './config'
import { store } from './db'
import { connect, createIndexes } from './db/client'
import { logger } from './logger'

async function start() {
  await Promise.allSettled([initDb(), initMessageBus()])

  server.listen(config.port, '0.0.0.0', async () => {
    logger.info({ port: config.port }, `Server started http://127.0.0.1:${config.port}`)
  })

  if (config.jsonStorage) {
    logger.info(`JSON storage enabled for guests: ${config.jsonFolder}`)
  }
}

// No longer accept requests when shutting down
// Allow as many responses currently generating to complete as possible during the shutdown window
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
