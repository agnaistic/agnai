import * as uuid from 'uuid'
import pino from 'pino'
import type { NextFunction, Response } from 'express'
import { StatusError, errors } from './api/wrap'
import { verifyApiKey } from './db/oauth'
import { verifyJwt } from './db/user'
import { config } from './config'
import { db, isConnected } from './db/client'
import { getUserSubscriptionTier } from '/common/util'
import { getCachedTiers } from './db/subscriptions'

const logLevel = getLogLevel()

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

export function debug(...args: any[]) {
  if (logLevel === 'debug' || logLevel === 'trace') {
    console.debug(...args)
  }
}

function parentLogger(name: string) {
  const level = getLogLevel()
  const opts: any = {
    transport,
    name,
    level,
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

const VALID_ID = /^[a-z0-9-]+$/g

const ID_KEYS = ['id', 'charId', 'inviteId', 'userId']

const INFERENCE_URLS: Record<string, boolean> = {
  '/models': true,
  '/v1/models': true,
  '/completions': true,
  '/v1/completions': true,
  '/chat/completions': true,
  '/v1/chat/completions': true,
  '/v1/image': true,
  '/v1/generate-image': true,
}

function isInferenceUrl(url: string) {
  return INFERENCE_URLS[url.toLowerCase()]
}

export function logMiddleware() {
  const middleware = async (req: any, res: Response, next: NextFunction) => {
    for (const prop in ID_KEYS) {
      const value = req.params[prop]
      if (value && !VALID_ID.test(value)) {
        return next(new StatusError('Bad request: Invalid ID', 400))
      }
    }

    const requestId = uuid.v4()
    const log = logger.child({ requestId, url: req.url, method: req.method })

    req.requestId = requestId
    req.log = log

    const canLog =
      req.method !== 'OPTIONS' &&
      (req.url.startsWith('/api') || req.url.startsWith('/v1') || isInferenceUrl(req.url)) &&
      !req.url.includes('/subscriptions?')

    const socketId = req.get('socket-id') || ''
    req.socketId = socketId

    const auth = req.get('authorization')
    if (auth && !isInferenceUrl(req.url)) {
      /** API Key usage */
      if (auth.startsWith('Key ') && config.auth.oauth) {
        const apikey = auth.replace('Key ', '')
        const key = await verifyApiKey(apikey)

        if (!key) {
          return next(errors.Unauthorized)
        }

        req.user = key
        req.userId = key.userId
        req.log.setBindings({ user: key.username })
      } else if (auth.startsWith('Bearer ')) {
        /** JWT usage */
        const token = auth.replace('Bearer ', '')
        try {
          const payload = verifyJwt(token)
          req.user = payload as any
          req.userId = (payload as any).userId
          req.log.setBindings({ user: (payload as any)?.username || 'anonymous' })
        } catch (ex) {
          req.user = {} as any
          return next(errors.Unauthorized)
        }
      } else {
        /** Auth header provided, but invalid */
        return next(errors.Unauthorized)
      }
    } else {
      req.log.setBindings({ guest: true })
    }

    if (req.userId && isConnected()) {
      const user = await db('user').findOne({ _id: req.userId })
      if (!user) {
        return next(errors.Unauthorized)
      }

      const sub = getUserSubscriptionTier(user, getCachedTiers())
      req.authed = user
      req.tier = sub?.tier
    }

    if (canLog) req.log.info('start request')

    const start = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - start
      if (canLog) req.log.info({ duration, statusCode: res.statusCode }, 'end request')
    })

    next()
  }

  return middleware
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
