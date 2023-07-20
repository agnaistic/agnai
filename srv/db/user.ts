import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { config } from '../config'
import { NOVEL_MODELS } from '../../common/adapters'
import { logger } from '../logger'
import { errors, StatusError } from '../api/wrap'
import { encryptPassword, now, STARTER_CHARACTER } from './util'

export type NewUser = {
  username: string
  password: string
  handle: string
  avatar?: string
}

export async function ensureInitialUser() {
  const user = await db('user').findOne({ kind: 'user', username: config.init.username })
  if (user) return

  await createUser(
    {
      handle: 'Admin',
      password: config.init.password,
      username: config.init.username.toLowerCase(),
    },
    true
  )

  logger.info(config.init, 'Created initial user')
}

export async function getMetrics() {
  const [totalUsers] = await Promise.all([db('user').countDocuments()])

  return { totalUsers }
}

export async function getProfile(userId: string) {
  const profile = await db('profile').findOne({ userId })
  return profile
}

export async function getUser(userId: string) {
  const user = await db('user').findOne({ _id: userId, kind: 'user' }, { projection: { hash: 0 } })
  return user
}

export async function updateUserUI(userId: string, props: Partial<AppSchema.User['ui']>) {
  const prev = await getUser(userId)
  if (!prev) throw errors.Unauthorized

  const next: AppSchema.User['ui'] = { ...prev.ui!, ...props }
  await db('user').updateOne({ _id: userId }, { $set: { ui: next, updatedAt: now() } })
}

export async function updateUser(userId: string, props: Partial<AppSchema.User>) {
  await db('user').updateOne({ _id: userId }, { $set: { ...props, updatedAt: now() } })
  return getUser(userId)
}

export async function updateProfile(userId: string, props: Partial<AppSchema.Profile>) {
  await db('profile').updateOne({ userId }, { $set: props })
  return getProfile(userId)
}

export async function authenticate(username: string, password: string) {
  const user = await db('user').findOne({ username: username.toLowerCase() })
  if (!user) return

  const match = await bcrypt.compare(password, user.hash)
  if (!match) return

  const profile = await db('profile').findOne({ userId: user._id })
  if (!profile) return

  const token = await createAccessToken(username, user)

  return { token, profile, user: { ...user, hash: undefined } }
}

export async function createUser(newUser: NewUser, admin?: boolean) {
  const username = newUser.username.toLowerCase().trim()
  const existing = await db('user').findOne({ kind: 'user', username })

  if (existing) {
    throw new StatusError(`Username taken`, 400)
  }

  const hash = await encryptPassword(newUser.password)

  const user: AppSchema.User = {
    _id: v4(),
    kind: 'user',
    username,
    hash,
    admin: !!admin,
    novelApiKey: '',
    defaultAdapter: 'horde',
    koboldUrl: '',
    thirdPartyFormat: 'kobold',
    thirdPartyPassword: '',
    novelModel: NOVEL_MODELS.euterpe,
    oobaUrl: '',
    hordeModel: 'PygmalionAI/pygmalion-6b',
    hordeKey: '',
    oaiKey: '',
    defaultPresets: {},
    useLocalPipeline: false,
    createdAt: new Date().toISOString(),
  }

  const startChar: AppSchema.Character = {
    ...STARTER_CHARACTER,
    _id: v4(),
    userId: user._id,
    createdAt: now(),
    updatedAt: now(),
  }

  await db('user').insertOne(user)
  await db('character').insertOne(startChar)

  const profile: AppSchema.Profile = {
    _id: v4(),
    userId: user._id,
    handle: newUser.handle,
    kind: 'profile',
    avatar: newUser.avatar,
  }
  await db('profile').insertOne(profile)
  const token = await createAccessToken(newUser.username, user)
  return { profile, token, user }
}

export async function createAccessToken(username: string, user: AppSchema.User) {
  const payload: Omit<AppSchema.Token, 'iat' | 'exp'> = {
    userId: user._id,
    username,
    admin: !!user.admin,
  }

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry,
  })
  return token
}

export async function createRemoteAccessToken(username: string, user: AppSchema.User) {
  const payload: Omit<AppSchema.Token, 'iat' | 'exp'> = {
    userId: user._id,
    username,
    admin: !!user.admin,
  }

  const key = getKey()
  if (key.type !== 'pem') {
    throw new StatusError('Unable to sign external JWTs', 500)
  }

  const token = jwt.sign(payload, key.key, {
    algorithm: 'RS256',
    expiresIn: config.jwtExpiry,
  })

  return token
}

export async function getProfiles(ownerId: string, userIds: string[]) {
  const list = await db('profile')
    .find({ kind: 'profile', userId: { $in: userIds.concat(ownerId) } })
    .toArray()
  return list
}

function getKey() {
  if (config.jwtPrivateKey) {
    return {
      type: 'pem',
      key: config.jwtPrivateKey,
    } as const
  }

  return {
    type: 'sig',
    key: config.jwtSecret,
  } as const
}

export function verifyJwt(token: string): any {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    return payload
  } catch (ex) {}

  if (config.jwtPrivateKey) {
    try {
      const payload = jwt.verify(token, config.jwtPrivateKey)
      return payload
    } catch (ex) {}
  }

  throw errors.Unauthorized
}
