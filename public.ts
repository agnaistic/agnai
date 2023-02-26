import { app } from './srv/app'
import { config } from './srv/config'
import { store } from './srv/db'
import { createIndexes } from './srv/db/client'
import { logger } from './srv/logger'
const lt = require('localtunnel')

async function start() {
  app.listen(config.port, '0.0.0.0', async () => {
    logger.info('Starting server')
    await createIndexes()
    await store.users.ensureInitialUser()
    logger.info({ port: config.port }, 'API ready')
    const tunnel = await lt({ port: config.port })
    logger.info(`****** Public URL: ${tunnel.url}  ******`)
  })
}

start()
