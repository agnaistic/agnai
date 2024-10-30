import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle, StatusError } from '../wrap'
import { OAuthScope, oauthScopes } from '/common/types'
import { patreon } from './patreon'
import { getSafeUserConfig } from './settings'
import { OAuth2Client } from 'google-auth-library'
import { createAccessToken, toSafeUser } from '/srv/db/user'

const GOOGLE = new OAuth2Client()

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

export const oathGoogleLogin = handle(async ({ log, body }) => {
  assertValid({ token: 'string' }, body)

  const config = await store.admin.getServerConfiguration().catch(() => undefined)

  if (!config?.googleClientId) {
    throw new StatusError('Not allowed', 405)
  }

  const token = await GOOGLE.verifyIdToken({
    idToken: body.token,
    audience: config.googleClientId,
  })

  const payload = token.getPayload()
  if (!payload) throw new StatusError('Could not verify Google token', 401)
  if (!payload.email || !payload.sub) throw new StatusError('Could not verify Google token', 401)

  const existing = await store.users.findByGoogleSub(payload.sub)
  if (existing) {
    await store.users.updateUser(existing._id, { google: payload as any })
    const token = await createAccessToken(existing.username, existing)
    const profile = await store.users.getProfile(existing._id)
    return { user: toSafeUser(existing), token, profile }
  }

  const newuser = await store.users.createUser({
    username: `google_${payload.sub}`,
    handle: payload.name || 'You',
    password: '',
  })
  await store.users.updateUser(newuser.user._id, { google: payload as any })
  log.info({ user: newuser.user.username, id: newuser.user._id }, 'User registered (Google OAuth)')
  return newuser
})

export const unlinkGoogleAccount = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId)
  if (!user) throw new StatusError('User not found', 404)

  if (!user.google?.sub) throw new StatusError('Account not linked with Google', 400)
  if (`google_${user.google.sub}` === user.username) {
    throw new StatusError('Account registered using Google - Cannot be unlinked', 400)
  }

  const next = await store.users.updateUser(userId, { google: null as any })
  return { user: next }
})

export const linkGoogleAccount = handle(async ({ body, userId }) => {
  assertValid({ token: 'string' }, body)

  const user = await store.users.getUser(userId)
  const config = await store.admin.getServerConfiguration().catch(() => undefined)

  if (!config?.googleClientId) {
    throw new StatusError('Not allowed', 405)
  }

  if (!user) throw new StatusError('Unauthorized: Account not found', 401)
  if (user.google?.sub) throw new StatusError('Account already linked to Google', 400)

  const token = await GOOGLE.verifyIdToken({
    idToken: body.token,
    audience: config.googleClientId,
  })

  const payload = token.getPayload()
  if (!payload) throw new StatusError('Could not verify Google token', 401)
  if (!payload.email || !payload.sub) throw new StatusError('Could not verify Google token', 401)

  const next = await store.users.updateUser(userId, { google: payload as any })
  return { user: toSafeUser(next!) }
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

  const token = await store.users.createAccessToken(user.username, user)
  return { token }
})

export const resyncPatreon = handle(async (req) => {
  await patreon.revalidatePatron(req.userId)
  const next = await getSafeUserConfig(req.userId)
  return next
})

export const verifyPatreonOauth = handle(async (req) => {
  const { body } = req
  assertValid({ code: 'string' }, body)
  await patreon.initialVerifyPatron(req.userId, body.code)
  return { success: true }
})

export const unlinkPatreon = handle(async (req) => {
  await store.users.unlinkPatreonAccount(req.userId, 'user initiated')

  return { success: true }
})
