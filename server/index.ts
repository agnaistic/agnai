import { app } from './app'
import { config } from './config'
import { db, store } from './db'
import { createIndexes } from './db/client'
import { logger } from './logger'

app.listen(config.port, '0.0.0.0', async () => {
  await createIndexes()
  await db().info()
  const settings = await store.settings.get()
  logger.info({ port: config.port, settings }, 'Server started')
})
