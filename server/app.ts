import express from 'express'
import cors from 'cors'
import { logMiddleware } from './logger'
import api from './api'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(logMiddleware)
app.use('/api', api)

export { app }
