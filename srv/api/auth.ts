import jwt from 'jsonwebtoken'
import { RequestHandler } from 'express'
import { AppRequest, errors } from './wrap'
import { config } from '../config'

export const authMiddleware: RequestHandler = (req: AppRequest, res, next) => {
  const header = req.get('authorization')
  if (!header) {
    return next()
  }

  if (!header.startsWith('Bearer ')) {
    return next(errors.Unauthorized)
  }

  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = payload as any
    req.userId = (payload as any).userId
    return next()
  } catch (ex) {
    req.user = {} as any
    return next(errors.Unauthorized)
  }
}

export const loggedIn: RequestHandler = (req: AppRequest, _, next) => {
  if (!req.user?.userId) return next(errors.Unauthorized)
  next()
}

export const isAdmin: RequestHandler = (req: AppRequest, _, next) => {
  if (!req.user?.admin) return next(errors.Forbidden)
  next()
}
