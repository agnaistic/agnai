import { app } from './app'
import { config } from './config'
import { store } from './db'
import { deleteAllChats } from './db/chats'
import { createIndexes } from './db/client'
import { logger } from './logger'

app.listen(config.port, '0.0.0.0', async () => {
  await createIndexes()

  // Initialise settings if empty
  await store.settings.get()

  // await deleteAllChats()
  logger.info({ port: config.port }, 'Server started')
})
