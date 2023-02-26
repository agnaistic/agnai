import express from 'express'
import cors from 'cors'
import { logMiddleware } from './logger'
import api from './api'
import { AppRequest, errors, StatusError } from './api/handle'
import { extname, resolve } from 'path'

const app = express()
const index = resolve(process.cwd(), 'dist', 'index.html')

app.use(express.json({ limit: '2mb' }), express.urlencoded({ extended: true }))
app.use(cors())
app.use(logMiddleware())
app.use('/api', api)
app.use('/', express.static('dist'))
app.use((req, res, next) => {
  if (req.url.startsWith('/url')) {
    return next(errors.NotFound)
  }

  const ext = extname(req.url)
  if (!ext) return res.sendFile(index)

  req.log.warn(`"${req.url}" "${ext}"`)
})
app.use((err: any, req: AppRequest, res: express.Response, _next: any) => {
  if (err.status > 0) {
    res.status(err.status)
  } else {
    res.status(500)
  }

  res.json({ message: err?.message || err || 'Internal server error' })
})

export { app }
