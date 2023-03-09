import { server } from './app'
import { config } from './config'
import { store } from './db'
import { connect, createIndexes } from './db/client'
import { logger } from './logger'

server.listen(config.port, '0.0.0.0', async () => {
  const db = await connect()
  if (db) {
    await createIndexes()

    // Initialise settings if empty
    await store.users.ensureInitialUser()
  }

  // await deleteAllChats()
  logger.info({ port: config.port }, 'Server started')
})
