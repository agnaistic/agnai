import * as express from 'express'

export function handle(handler: Handler) {
  const wrapped: express.RequestHandler = async (req, res, next) => {
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

export type Handler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => any
