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
      // We want to ensure that all requests are terminated
      const result = await handler(req as any, res, wrappedNext)
      if (!nextCalled && !res.writableEnded) {
        const accept = req.headers.accept

        switch (accept) {
          case 'text/event-stream':
            res.end()
            break

          case 'application/json':
          default:
            // Don't "safely" (i.e. 200) if a JSON route handler doesn't correctly respond
            if (!result) {
              const err = new StatusError('Server API failed to respond', 500)
              req.log.error({ err }, 'Unexpected handler fall-through')
              next(err)
              break
            }

            res.json(result)
            break
        }
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

class BannedError extends StatusError {
  public banned = true

  constructor(public reason: string) {
    super(reason, 401)
  }
}

export type Handler = (req: AppRequest, res: express.Response, next: express.NextFunction) => any

export type AppRequest<T = any> = Omit<express.Request, 'log' | 'body'> & {
  user?: AppSchema.Token
  requestId: string
  userId: string
  log: AppLog
  socketId: string
  scopes?: string[]
  authed?: AppSchema.User
  tier?: AppSchema.SubscriptionTier
  body: T
}

export const errors = {
  NotFound: new StatusError('Resource not found', 404),
  CharacterNotFound: new StatusError('Character not found', 404),
  ChatNotFound: new StatusError('Chat not found', 404),
  Unauthorized: new StatusError('Unauthorized', 401),
  Forbidden: new StatusError('Forbidden', 403),
  BadRequest: new StatusError('Bad request', 400),
  UserBanned: (reason: string) => new BannedError(reason || 'No reason given'),
}
