import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { config } from '../config'
import { NOVEL_MODELS } from '../../common/adapters'
import { logger } from '../logger'
import { errors } from '../api/wrap'
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
  const profile = await db('profile').findOne({ kind: 'profile', userId })
  return profile
}

export async function getUser(userId: string) {
  const user = await db('user').findOne({ _id: userId, kind: 'user' }, { projection: { hash: 0 } })
  return user
}

export async function updateUser(userId: string, props: Partial<AppSchema.User>) {
  await db('user').updateOne({ _id: userId, kind: 'user' }, { $set: props })
  return getUser(userId)
}

export async function updateProfile(userId: string, props: Partial<AppSchema.Profile>) {
  await db('profile').updateOne({ kind: 'profile', userId }, { $set: props })
  return getProfile(userId)
}

export async function authenticate(username: string, password: string) {
  const user = await db('user').findOne({ kind: 'user', username: username.toLowerCase() })
  if (!user) return

  const match = await bcrypt.compare(password, user.hash)
  if (!match) return

  const profile = await db('profile').findOne({ kind: 'profile', userId: user._id })
  if (!profile) return

  const token = await createAccessToken(username, user)

  return { token, profile, user: { ...user, hash: undefined } }
}

export async function createUser(newUser: NewUser, admin?: boolean) {
  const username = newUser.username.toLowerCase()
  const existing = await db('user').findOne({ kind: 'user', username })

  if (existing) {
    throw errors.BadRequest
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
    luminaiUrl: '',
    oobaUrl: '',
    hordeModel: 'PygmalionAI/pygmalion-6b',
    hordeKey: '',
    oaiKey: '',
    defaultPresets: {},
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
    expiresIn: '7d',
  })

  return token
}

export async function getProfiles(ownerId: string, userIds: string[]) {
  const list = await db('profile')
    .find({ kind: 'profile', userId: { $in: userIds.concat(ownerId) } })
    .toArray()
  return list
}
