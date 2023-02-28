import jwt from 'jsonwebtoken'
import { RequestHandler } from 'express'
import { AppRequest, StatusError } from './wrap'
import { config } from '../config'

export const authMiddleware: RequestHandler = (req: AppRequest, res, next) => {
  const header = req.get('authorization')
  if (!header) {
    return next()
  }

  if (!header.startsWith('Bearer ')) {
    return next(AuthError)
  }

  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = payload as any
    req.userId = (payload as any).userId
    return next()
  } catch (ex) {
    req.user = {} as any
    return next(AuthError)
  }
}

export const loggedIn: RequestHandler = (req: AppRequest, _, next) => {
  if (!req.user?.userId) return next(AuthError)
  next()
}

const AuthError = new StatusError('Authorized', 401)
