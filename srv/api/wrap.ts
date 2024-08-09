import * as express from 'express'
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'

export function handle(handler: Handler): express.RequestHandler {
  const wrapped = async (req: AppRequest, res: express.Response, next: express.NextFunction) => {
    let nextCalled = false
    const wrappedNext = (err?: any) => {
      nextCalled = true
      next(err)
    }

    try {
      const result = await handler(req as any, res, wrappedNext)
      if (!res.headersSent && !nextCalled && !!result) {
        res.json(result)
      }
    } catch (ex) {
      req.log.error({ err: ex }, 'Error occurred handling request')
      if (!res.headersSent) next(ex)
    }
  }
  return wrapped as any as express.RequestHandler
}

export const wrap = handle

export class StatusError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg)
  }
}

export type Handler = (req: AppRequest, res: express.Response, next: express.NextFunction) => any

export type AppRequest = Omit<express.Request, 'log'> & {
  user?: AppSchema.Token
  requestId: string
  userId: string
  log: AppLog
  socketId: string
  scopes?: string[]
  authed?: AppSchema.User
  tier?: AppSchema.SubscriptionTier
}

export const errors = {
  NotFound: new StatusError('Resource not found', 404),
  Unauthorized: new StatusError('Unauthorized', 401),
  Forbidden: new StatusError('Forbidden', 403),
  BadRequest: new StatusError('Bad request', 400),
}
