import { app } from './app'
import { config } from './config'
import { db, store } from './db'
import { deleteAllChats } from './db/chats'
import { createIndexes } from './db/client'
import { logger } from './logger'

app.listen(config.port, '0.0.0.0', async () => {
  await createIndexes()
  const settings = await store.settings.get()
  // await deleteAllChats()
  logger.info({ port: config.port, settings }, 'Server started')
})
