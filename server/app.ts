import express from 'express'
import cors from 'cors'
import { logMiddleware } from './logger'
import api from './api'
import { StatusError } from './api/handle'

const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(cors())
app.use(logMiddleware())
app.use('/api', api)
app.use((_, __, next) => {
  next(new StatusError('Not found', 404))
})
app.use((err: any, _: any, res: express.Response, _next: any) => {
  if (err.status > 0) {
    res.status(err.status)
  } else {
    res.status(500)
  }

  res.json({ message: err?.message || err || 'Internal server error' })
})

export { app }
