import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { config } from '../config'
import { NOVEL_MODELS } from '../../common/adapters'
import { logger } from '../logger'
import { errors, StatusError } from '../api/wrap'
import { encryptPassword, now } from './util'
import { defaultChars } from '/common/characters'
import { resyncSubscription } from '../api/billing/stripe'
import { getCachedTiers, getTier } from './subscriptions'
import { store } from '.'
import { patreon } from '../api/user/patreon'
import { getUserSubscriptionTier } from '/common/util'

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
    hordeModel: 'any',
    hordeKey: '',
    oaiKey: '',
    defaultPresets: {},
    useLocalPipeline: false,
    createdAt: new Date().toISOString(),
  }

  await db('user').insertOne(user)

  for (const char of Object.values(defaultChars)) {
    const nextChar: AppSchema.Character = {
      _id: v4(),
      kind: 'character',
      userId: user._id,
      favorite: false,
      visualType: 'avatar',
      updatedAt: now(),
      createdAt: now(),
      ...char,
    }
    await db('character').insertOne(nextChar)
  }

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

export async function updateLimit(userId: string) {
  const last = new Date().toISOString()
  const res = await db('user').updateOne(
    { _id: userId },
    { $set: { 'sub.last': last } },
    { upsert: false }
  )
  if (res.modifiedCount === 0) {
    throw new Error(`User not found`)
  }
}

export async function updateUserTier(userId: string, tierId: string) {
  const tier = await getTier(tierId)
  await db('user').updateOne(
    { _id: userId },
    { $set: { 'sub.level': tier.level, 'sub.tierId': tierId } },
    { upsert: false }
  )
}

export async function deleteUserAccount(userId: string) {
  if (!userId) {
    throw new Error(`No user id provided`)
  }

  const chats = await db('chat').find({ userId }).toArray()
  await db('character').deleteMany({ userId })
  await db('memory').deleteMany({ userId })
  await db('scenario').deleteMany({ userId })
  await db('gen-setting').deleteMany({ userId })
  await db('chat-message').deleteMany({ chatId: { $in: chats.map((ch) => ch._id) } })
  await db('chat-invite').deleteMany({ byUserId: userId })
  await db('chat-invite').deleteMany({ invitedId: userId })
  await db('chat').deleteMany({ userId })
  await db('user').deleteOne({ _id: userId })

  // We keep the user profile in a skeleton state to ensure no issues occur in chats they were a participant of.
  await db('profile').updateOne({ userId }, { $set: { handle: 'Unknown', avatar: '' } })
}

export async function validateApiAccess(apiKey: string) {
  const config = await db('configuration').findOne({ kind: 'configuration' })
  if (!config?.apiAccess || config.apiAccess === 'off') return

  const user = await db('user').findOne({ apiKey })
  if (!user) return

  if (config.apiAccess === 'admins') {
    if (!user.admin) return
    return { user }
  }

  if (config.apiAccess === 'subscribers') {
    if (user.admin) return { user }
    const tier = store.users.getUserSubTier(user)
    if (!tier || tier.level <= 0) return
    const sub = await db('subscription-tier').findOne({ _id: user.sub?.tierId })
    if (!sub?.apiAccess) return

    return { user }
  }

  if (config.apiAccess === 'users') return { user }
}

export async function findByPatreonUserId(id: string) {
  const user = await db('user').findOne({ patreonUserId: id })
  return user
}

const ONE_HOUR_MS = 60000 * 60

export async function validateSubscription(user: AppSchema.User) {
  if (user.admin) return Infinity

  const sub = getUserSubTier(user)
  if (!sub) return -1

  const { type, tier, level } = sub
  if (!tier.enabled) return tier.level ?? -1

  if (type === 'manual') {
    return sub.level
  }

  if (type === 'patreon') {
    if (!user.patreon) return -1

    const expiry = new Date(user.patreon.member?.attributes.next_charge_date || 0)

    // If the next_charge_date has elapsed then we re-check
    // We regularly re-sync Patron information so we can rely on this date
    if (expiry.valueOf() <= Date.now()) {
      const next = await patreon.revalidatePatron(user._id)
      if (!next) return -1
      const tier = getUserSubTier(next)
      if (!tier) return -1
      return tier.level
    }

    return level
  }

  // We check the billing information regularly and it is updated immediately after up or downgrading
  // We will check this less frequently
  // @todo consider using the cached billing info if Stripe fails to respond (e.g. 5xx error)
  if (user.billing?.lastChecked) {
    const hourAgo = Date.now() - ONE_HOUR_MS
    const checked = new Date(user.billing.lastChecked).valueOf()

    if (hourAgo < checked) {
      return sub?.level ?? -1
    }
  }

  const nextLevel = await resyncSubscription(user)
  if (nextLevel instanceof Error) {
    return nextLevel
  }

  return nextLevel ?? -1
}

export function getUserSubTier(user: AppSchema.User) {
  const tiers = getCachedTiers()
  return getUserSubscriptionTier(user, tiers)
}
