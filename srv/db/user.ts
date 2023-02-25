import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { config } from '../config'
import { NOVEL_MODELS } from '../../common/adapters'
import { logger } from '../logger'

const users = db('user')
const profiles = db('profile')

export type NewUser = {
  username: string
  password: string
  handle: string
  avatar?: string
}

export async function ensureInitialUser() {
  const user = await users.findOne({ username: config.init.username })
  if (user) return

  await createUser(
    {
      handle: config.init.username,
      password: config.init.password,
      username: config.init.username,
    },
    true
  )

  logger.info(config.init, 'Created initial user')
}

export async function getProfile(userId: string) {
  const profile = await profiles.findOne({ userId })
  return profile
}

export async function getUser(userId: string) {
  const user = await users.findOne({ _id: userId }, { hash: 0 })
  return user
}

export async function updateUser(userId: string, props: Partial<AppSchema.User>) {
  await users.updateOne({ _id: userId }, { $set: props })
  return getUser(userId)
}

export async function updateProfile(userId: string, props: Partial<AppSchema.Profile>) {
  await users.updateOne({ userId }, { $set: props })
  return getProfile(userId)
}

export async function authenticate(username: string, password: string) {
  const user = await users.findOne({ username })
  if (!user) return

  const match = await bcrypt.compare(password, user.hash)
  if (!match) return

  const profile = await profiles.findOne({ userId: user._id })
  if (!profile) return

  const token = await createAccessToken(username, user)

  return { token, profile, user: { ...user, hash: undefined } }
}

export async function createUser(newUser: NewUser, admin?: boolean) {
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(newUser.password, salt)

  const user: AppSchema.User = {
    _id: v4(),
    kind: 'user',
    username: newUser.username,
    hash,
    admin: !!admin,
    novelApiKey: '',
    defaultAdapter: 'chai',
    koboldUrl: '',
    novelModel: NOVEL_MODELS.euterpe,
  }

  await users.insertOne(user)

  const profile: AppSchema.Profile = {
    _id: v4(),
    userId: user._id,
    handle: newUser.handle,
    kind: 'profile',
    avatar: newUser.avatar,
  }
  await profiles.insertOne(profile)
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
  const list = await profiles.find(
    { kind: 'profile', userId: { $in: userIds.concat(ownerId) } },
    { _id: 0, admin: 0 }
  )
  return list
}
