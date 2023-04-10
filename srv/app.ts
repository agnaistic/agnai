import express from 'express'
import cors from 'cors'
import { logMiddleware } from './logger'
import api from './api'
import { errors } from './api/wrap'
import { resolve } from 'path'
import { Server } from 'http'
import { setupSockets } from './api/ws'
import { config } from './config'

const app = express()
const server = new Server(app)

const baseFolder = resolve(__dirname, '..')

setupSockets(server)

const index = resolve(baseFolder, 'dist', 'index.html')

app.use(
  express.json({ limit: `${config.limits.payload}mb` }),
  express.urlencoded({ limit: `${config.limits.upload}mb`, extended: true })
)
app.use(logMiddleware())
app.use(cors())
app.use('/api', api)

app.use('/', express.static(config.assetFolder))
app.use('/', express.static(resolve(baseFolder, 'dist')))
app.use('/', express.static(resolve(baseFolder, 'assets')))

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
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
