import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { logMiddleware } from './logger'
import api, { keyedRouter } from './api'
import { errors } from './api/wrap'
import { resolve } from 'path'
import { setupSockets } from './api/ws'
import { config } from './config'
import { createServer } from './server'
import pipeline from './api/pipeline'

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
app.use(cors())
app.use(upload.any())

const baseFolder = resolve(__dirname, '..')

setupSockets(server)

const index = resolve(baseFolder, 'dist', 'index.html')

app.use('/v1', keyedRouter)
app.use('/api', api)

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

export { app, server }
