import express from 'express'
import cors from 'cors'
import { logMiddleware } from './logger'
import api from './api'
import { StatusError } from './api/handle'

const app = express()

app.use(logMiddleware())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/api', api)
app.use((_, __, next) => {
  next(new StatusError('Not found', 404))
})
app.use((err, req, res, next) => {
  if (err.status > 0) {
    res.status(res.status)
  }

  res.json({ message: err?.message || err || 'Internal server error' })
})

export { app }
