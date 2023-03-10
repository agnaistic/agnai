import { initMessageBus } from './api/ws'
import { server } from './app'
import { config } from './config'
import { store } from './db'
import { connect, createIndexes } from './db/client'
import { logger } from './logger'

async function start() {
  await Promise.all([initDb(), initMessageBus()])
  // await deleteAllChats()
  logger.info({ port: config.port }, 'Server started')
}

server.listen(config.port, '0.0.0.0', async () => {
  await // await deleteAllChats()
  logger.info({ port: config.port }, 'Server started')
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
