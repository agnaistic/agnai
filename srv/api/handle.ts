import * as express from 'express'
import { Logger } from 'pino'
import { AppSchema } from '../db/schema'

export function handle(handler: Handler) {
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
      next(ex)
    }
  }
  return wrapped
}

export const wrap = handle

export class StatusError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg)
  }
}

export type Handler = (req: AppRequest, res: express.Response, next: express.NextFunction) => any

export type AppRequest = express.Request & {
  user?: AppSchema.Token
  userId?: string
  log: Logger
}

export const errors = {
  NotFound: new StatusError('Resource not found', 404),
  Unauthorized: new StatusError('Unauthorized', 401),
  Forbidden: new StatusError('Forbidden', 403),
}
