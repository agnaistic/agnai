import { app } from './app'
import { config } from './config'
import { db, store } from './db'
import { logger } from './logger'

app.listen(config.port, '0.0.0.0', async () => {
  logger.info({ port: config.port }, 'Server started')
  const info = await db().info()
  const settings = await store.settings.get()
  logger.info({ info, settings }, 'Database info')
})
