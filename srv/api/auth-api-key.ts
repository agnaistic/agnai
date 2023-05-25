import { Response, NextFunction } from 'express'
import { store } from '../db'
import { AppSchema } from '../db/schema'
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

  // TODO: Keep track in Redis and/or local cache if the API is used a lot
  const keyRecord = await store.apiKey.getApiKeyByKey(apiKey)

  if (!keyRecord) {
    return res.status(401).send({ error: 'Invalid API key' })
  }

  req.userId = keyRecord.userId
  req.user = {
    userId: keyRecord.userId,
    username: 'api user',
    admin: false,
    exp: 0,
    iat: 0,
  } as AppSchema.Token

  next()
}
