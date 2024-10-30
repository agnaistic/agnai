import { NextFunction } from 'express'
import { AppRequest, errors } from './wrap'
import { store } from '../db'
import { verifyJwt } from '../db/user'

export const loggedIn: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.userId) return next(errors.Unauthorized)
  next()
}

export const isAdmin: any = (req: AppRequest, _: any, next: NextFunction) => {
  if (!req.user?.admin) return next(errors.Forbidden)
  next()
}

export const apiKeyUsage: any = async (req: AppRequest, _: any, next: NextFunction) => {
  let key = req.get('x-api-key') || req.get('authorization')
  if (!key) {
    return next(errors.Unauthorized)
  }

  key = key.replace('Bearer ', '')

  try {
    const payload = verifyJwt(key)

    if (payload?.username) {
      req.userId = (payload as any).userId
      const user = await store.users.getUser(req.userId)
      req.authed = user! || {}
      req.log.setBindings({ user: (payload as any)?.username || 'anonymous' })
      return next()
    }
  } catch (ex) {}

  const access = await store.users.validateApiAccess(key)
  if (!access) {
    return next(errors.Unauthorized)
  }

  req.userId = access.user._id

  req.user = {
    admin: access.user.admin,
    exp: Infinity,
    iat: 0,
    userId: access.user._id,
    username: access.user.username,
  }

  req.authed = access.user
  req.log.setBindings({ user: access.user.username, guest: undefined })

  next()
}
