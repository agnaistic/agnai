import { NextFunction } from 'express'
import { AppRequest, errors } from './wrap'

export const loggedIn: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.userId) return next(errors.Unauthorized)
  next()
}

export const isAdmin: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.admin) return next(errors.Forbidden)
  next()
}

export const apiKeyUsage = async (req: AppRequest, _: any, next: NextFunction) => {
  const key = req.get('x-api-key')
  if (!key) {
    return next(errors.Unauthorized)
  }
}
