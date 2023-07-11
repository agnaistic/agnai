import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle, StatusError } from '../wrap'
import { OAuthScope, oauthScopes } from '/common/types'

export const register = handle(async (req) => {
  assertValid({ handle: 'string', username: 'string', password: 'string' }, req.body)
  const { profile, token, user } = await store.users.createUser(req.body)
  req.log.info({ user: user.username, id: user._id }, 'User registered')
  return { profile, token, user }
})

export const login = handle(async (req) => {
  assertValid({ username: 'string', password: 'string' }, req.body)
  const result = await store.users.authenticate(req.body.username.trim(), req.body.password)

  if (!result) {
    throw new StatusError('Unauthorized', 401)
  }

  return result
})

export const changePassword = handle(async (req) => {
  assertValid({ password: 'string' }, req.body)
  await store.admin.changePassword({ userId: req.userId, password: req.body.password })
  return { success: true }
})

export const createApiKey = handle(async (req) => {
  assertValid({ scopes: ['string?'] }, req.body)

  const scopes: OAuthScope[] = []
  for (const scope of req.body.scopes || []) {
    assertValid({ scope: oauthScopes }, scope)
    scopes.push(scope as OAuthScope)
  }

  const code = await store.oauth.prepare(req.userId, req.header('origin') || 'unknown', scopes)
  return { code }
})

export const verifyOauthKey = handle(async (req) => {
  assertValid({ code: 'string' }, req.body)

  const apiKey = await store.oauth.activateKey(req.userId, req.body.code)
  return { key: apiKey }
})

export const remoteLogin = handle(async (req) => {
  const user = await store.users.getUser(req.userId)
  if (!user) throw errors.Unauthorized

  const token = await store.users.createRemoteAccessToken(user.username, user)
  return { token }
})
