import * as uuid from 'uuid'
import pino from 'pino'
import { NextFunction, Response } from 'express'

const transport =
  process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { translateTime: `UTC:yyyy-mm-dd'T'HH:MM:ss'Z'` } }
    : undefined

export type AppLog = Omit<pino.Logger, 'child'> & {
  setBindings: (bindings: pino.Bindings) => void
  child: (bindings: pino.Bindings, options?: pino.ChildLoggerOptions) => AppLog
} & pino.Logger

export function createLogger(name: string) {
  const child = logger.child({ name })
  return child
}

function parentLogger(name: string) {
  const opts: any = {
    transport,
    name,
    level: getLogLevel(),
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  }

  if (!opts.transport) {
    opts.timestamp = () => `,"time":"${new Date().toISOString()}"`
  }

  return pino(opts) as any as AppLog
}

export function logMiddleware() {
  const toRedact = new Set<string>(['password', 'token'])
  const middleware = (req: any, res: Response, next: NextFunction) => {
    const body: any = { ...req.body }

    redact(toRedact, body)

    const log = logger.child({ requestId: uuid.v4(), url: req.url, method: req.method, body })

    req.log = log

    req.log.info('start request')

    const start = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - start
      req.log.info({ duration, statusCode: res.statusCode }, 'end request')
    })

    next()
  }

  return middleware
}

function redact(toRedact: Set<string>, body: any) {
  if (!body) return
  if (typeof body !== 'object') return

  for (const key in body) {
    if (toRedact.has(key) && typeof body[key] === 'string') {
      body[key] = '[REDACTED]'
      continue
    }

    redact(toRedact, body[key])
  }
}

export const logger = parentLogger('app')

function getLogLevel() {
  const level = process.env.LOG_LEVEL || 'info'
  switch (level) {
    case '60':
    case 'fatal':
      return 'fatal'

    case '50':
    case 'error':
      return 'error'

    case '40':
    case 'warn':
      return 'warn'

    case '30':
    case 'info':
      return 'info'

    case '20':
    case 'debug':
      return 'debug'

    case '10':
    case 'trace':
      return 'trace'
  }

  return 'info'
}
