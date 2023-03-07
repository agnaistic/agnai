import jwt from 'jsonwebtoken'
import { NextFunction, Response } from 'express'
import { AppRequest, errors } from './wrap'
import { config } from '../config'

export const authMiddleware: any = (req: AppRequest, _res: Response, next: NextFunction) => {
  const socketId = req.get('socket-id') || ''
  req.socketId = socketId

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

export const loggedIn: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.userId) return next(errors.Unauthorized)
  next()
}

export const isAdmin: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.admin) return next(errors.Forbidden)
  next()
}
