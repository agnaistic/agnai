import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { logMiddleware } from './middleware'
import api, { keyed } from './api'
import { errors, wrap } from './api/wrap'
import { resolve } from 'path'
import { setupSockets } from './api/ws'
import { config } from './config'
import { createServer } from './server'
import pipeline from './api/pipeline'
import { getDb } from './db/client'
import { isConnected } from './api/ws/redis'
import { wait } from './db/util'

export function createApp() {
  const upload = multer({
    limits: {
      fileSize: config.limits.upload * 1024 * 1024,
      fieldSize: config.limits.upload * 1024 * 1024,
    },
  })

  const app = express()
  const server = createServer(app)

  app.use(
    cors({
      origin: true,
      optionsSuccessStatus: 200,
    })
  )
  app.use(express.urlencoded({ limit: `${config.limits.upload}mb`, extended: false }))
  app.use(express.json({ limit: `${config.limits.payload}mb` }))
  app.use(logMiddleware())
  app.use(upload.any())

  const baseFolder = resolve(__dirname, '..')

  setupSockets(server)

  const index = resolve(baseFolder, 'dist', 'index.html')

  keyed(app)

  app.use('/api', api)

  app.get(
    '/healthcheck',
    wrap(async (req, res) => {
      const sleep = +(req.query.sleep || '0')
      if (sleep > 0) {
        req.log.info(`sleeping ${sleep}s`)
        await wait(sleep * 1000)
      }

      const dbHost = config.db.host || config.db.uri
      if (!config.redis.host && !dbHost) {
        return res.status(200).json({ message: 'ok', status: true, db: false, redis: false })
      }

      let db = !config.db.host

      try {
        if (dbHost) getDb()
        db = true

        if (!!config.redis.host && !isConnected()) {
          throw new Error('Redis not ready')
        }

        res
          .status(200)
          .json({ message: 'ok', status: true, db: !!dbHost, redis: !!config.redis.host })
      } catch (ex) {
        res
          .status(503)
          .json({ message: 'Database(s) not ready', status: false, db, redis: !isConnected() })
      }
    })
  )

  if (config.pipelineProxy) {
    app.use('/pipeline', pipeline)
  }

  if (!config.storage.enabled) {
    app.use('/assets', express.static(config.assetFolder))
    app.use('/', express.static(config.assetFolder))
    app.use('/', express.static(resolve(baseFolder, 'assets')))
  }

  app.use('/', express.static(resolve(baseFolder, 'dist')))
  app.use('/', express.static(resolve(baseFolder, 'extras')))
  if (config.extraFolder) {
    app.use('/', express.static(config.extraFolder))
  }

  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/v1')) {
      return next(errors.NotFound)
    }

    return res.sendFile(index)
  })
  app.use((err: any, _req: any, res: express.Response, _next: any) => {
    if (err.banned) {
      res.status(401)
      res.json({ message: err.message, user_banned: true })
      return
    }
    if (err.status > 0) {
      res.status(err.status)
    } else {
      res.status(500)
    }

    res.json({ message: err?.message || err || 'Internal server error' })
  })

  return { server, app }
}
