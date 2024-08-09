import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { logMiddleware } from './middleware'
import api, { keyedRouter } from './api'
import { errors } from './api/wrap'
import { resolve } from 'path'
import { setupSockets } from './api/ws'
import { config } from './config'
import { createServer } from './server'
import pipeline from './api/pipeline'
import { getDb } from './db/client'

export function createApp() {
  const upload = multer({
    limits: {
      fileSize: config.limits.upload * 1024 * 1024,
      fieldSize: config.limits.upload * 1024 * 1024,
    },
  })

  const app = express()
  const server = createServer(app)

  app.use(express.urlencoded({ limit: `${config.limits.upload}mb`, extended: false }))
  app.use(express.json({ limit: `${config.limits.payload}mb` }))
  app.use(logMiddleware())
  app.use(
    cors({
      origin: true,
      optionsSuccessStatus: 200,
    })
  )
  app.use(upload.any())

  const baseFolder = resolve(__dirname, '..')

  setupSockets(server)

  const index = resolve(baseFolder, 'dist', 'index.html')

  app.use('/v1', keyedRouter)
  app.use('/api', api)

  if (config.db.host || config.db.uri) {
    app.get('/healthcheck', (_, res) => {
      try {
        getDb()
        res.status(200).json({ message: 'okay', status: true })
      } catch (ex) {
        res.status(503).json({ message: 'Database not ready', status: false })
      }
    })
  }

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
    if (err.status > 0) {
      res.status(err.status)
    } else {
      res.status(500)
    }

    res.json({ message: err?.message || err || 'Internal server error' })
  })

  return { server, app }
}
