import { app } from './app'
import { config } from './config'
import { store } from './db'
import { logger } from './logger'

app.listen(config.port, '0.0.0.0', async () => {
  logger.info({ port: config.port }, 'Server started')
  const settings = await store.settings.get()
  logger.info({ settings }, 'Database info')
})
