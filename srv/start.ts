import 'module-alias/register'
import { prepareTokenizers } from './tokenize'
import lt from 'localtunnel'
import * as os from 'os'
import throng from 'throng'
import { initMessageBus } from './api/ws'
import { server } from './app'
import { config } from './config'
import { store } from './db'
import { connect, createIndexes } from './db/client'
import { logger } from './logger'
const pkg = require('../package.json')

export async function start() {
  // No longer accept requests when shutting down
  // Allow as many responses currently generating to complete as possible during the shutdown window
  // The shutdown window is ~10 seconds
  process.on('SIGTERM', () => {
    logger.warn(`Received SIGTERM. Server shutting down.`)
    server.close()
  })

  process.on('uncaughtException', (ex) => {
    logger.error({ err: ex.message || ex }, 'Unhandled exception')
  })

  process.on('unhandledRejection', (ex: any) => {
    logger.error({ err: ex?.message || ex }, 'Unhandled rejection')
  })

  prepareTokenizers()
  await Promise.allSettled([initDb(), initMessageBus()])

  server.on('error', (err) => {
    logger.error({ cause: err.message }, 'Failed to start API')
  })

  server.listen(config.port, '0.0.0.0', async () => {
    logger.info(
      { port: config.port, version: pkg.version },
      `Server started http://127.0.0.1:${config.port}`
    )

    if (config.publicTunnel) {
      await startTunnel()
    }
  })

  if (config.jsonStorage) {
    logger.info(`JSON storage enabled for guests: ${config.jsonFolder}`)
  }
}

async function initDb() {
  if (config.ui.maintenance) {
    logger.warn(`Maintenance mode enabled: Will not connect to database`)
    return
  }

  const db = await connect()
  if (db) {
    await createIndexes()
    // Initialise settings if empty
    await store.users.ensureInitialUser()
  }
}

async function startWorker(id?: number) {
  if (id) logger.setBindings({ w_id: id })

  await start().catch((error) => {
    logger.error(error, 'Server startup failed')
    process.exit(1)
  })
}

if (config.clustering) {
  logger.info('Using clustering')
  throng({
    worker: startWorker,
    lifetime: Infinity,
    count: os.cpus().length,
    grace: 2000,
    signals: ['SIGTERM', 'SIGINT'],
  })
} else {
  startWorker()
}

async function startTunnel() {
  const proxy = await lt({ port: config.port })
  logger.info(`[LocalTunnel] Agnaistic public URL: ${proxy.url}`)

  proxy.on('close', () => {
    logger.warn('[LocalTunnel] Agnaistic public URL close')
  })
}
