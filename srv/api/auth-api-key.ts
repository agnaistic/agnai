import { Response, NextFunction } from 'express'
import { store } from '../db'
import { AppRequest } from './wrap'

export const authApiKeyMiddleware: any = async (
  req: AppRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userId) {
    return next()
  }

  const apiKey = req.header('X-API-KEY')
  if (!apiKey) {
    return next()
  }

  const keyRecord = await store.apiKey.getApiKeyByKey(apiKey)

  if (!keyRecord) {
    return res.status(401).send({ error: 'Invalid API key' })
  }

  // Attaching user id to the request for further use in the route handler.
  req.userId = keyRecord.userId
  next()
}
