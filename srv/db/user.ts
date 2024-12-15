import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { config } from '../config'
import { NOVEL_MODELS } from '../../common/adapters'
import { logger } from '../middleware'
import { errors, StatusError } from '../api/wrap'
import { decryptText, encryptPassword, encryptUserText, now } from './util'
import { defaultChars } from '/common/characters'
import { resyncSubscription } from '../api/billing/stripe'
import { getCachedSubscriptionModels, getCachedTiers, getTier } from './subscriptions'
import { store } from '.'
import { patreon } from '../api/user/patreon'
import { getUserSubscriptionTier } from '/common/util'
import { command } from '../domains'
import { getRegisteredAdapters } from '../adapter/register'

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

  return { token, profile, user: toSafeUser(user) }
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
    disableLTM: true,
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

  const sub = getCachedSubscriptionModels().find((m) => m.isDefaultSub)
  if (sub) {
    const preset: AppSchema.UserGenPreset = {
      _id: v4(),
      kind: 'gen-setting',
      maxTokens: sub.maxTokens,
      name: 'My Preset',
      repetitionPenalty: sub.repetitionPenalty,
      repetitionPenaltyRange: sub.repetitionPenaltyRange,
      repetitionPenaltySlope: sub.repetitionPenaltySlope,
      tailFreeSampling: sub.tailFreeSampling,
      temp: sub.temp,
      topA: sub.topA,
      topK: sub.topK,
      topP: sub.topP,
      typicalP: sub.typicalP,
      userId: user._id,
      addBosToken: sub.addBosToken,
      antiBond: sub.antiBond,
      banEosToken: sub.banEosToken,
      cfgOppose: sub.cfgOppose,
      cfgScale: sub.cfgScale,
      doSample: sub.doSample,
      dynatemp_exponent: sub.dynatemp_exponent,
      dynatemp_range: sub.dynatemp_range,
      earlyStopping: sub.earlyStopping,
      encoderRepitionPenalty: sub.encoderRepitionPenalty,
      epsilonCutoff: sub.epsilonCutoff,
      frequencyPenalty: sub.frequencyPenalty,
      etaCutoff: sub.etaCutoff,
      gaslight: sub.gaslight,
      maxContextLength: sub.maxContextLength,
      registered: sub.registered,
      memoryChatEmbedLimit: sub.memoryChatEmbedLimit,
      memoryContextLimit: sub.memoryContextLimit,
      memoryDepth: sub.memoryDepth,
      memoryReverseWeight: sub.memoryReverseWeight,
      memoryUserEmbedLimit: sub.memoryUserEmbedLimit,
      minP: sub.minP,
      mirostatLR: sub.mirostatLR,
      mirostatTau: sub.mirostatTau,
      modelFormat: sub.modelFormat,
      mirostatToggle: sub.mirostatToggle,
      penaltyAlpha: sub.penaltyAlpha,
      phraseBias: sub.phraseBias,
      phraseRepPenalty: sub.phraseRepPenalty,
      presencePenalty: sub.presencePenalty,
      prefill: sub.prefill,
      streamResponse: sub.streamResponse,
      thirdPartyFormat: sub.thirdPartyFormat,
      thirdPartyModel: sub.thirdPartyModel,
      service: sub.service,
      smoothingCurve: sub.smoothingCurve,
      smoothingFactor: sub.smoothingFactor,
      tokenHealing: sub.tokenHealing,
      tempLast: sub.tempLast,
    }

    await db('gen-setting').insertOne(preset)
    await db('user').updateOne({ _id: user._id }, { $set: { defaultPreset: preset._id } })
    user.defaultPreset = preset._id
  }

  return { profile, token, user: toSafeUser(user) }
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

  try {
    const payload = jwt.verify(token, `${config.jwtSecret}\n`)
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
    const sub = await db('subscription-tier').findOne({ _id: tier.tier._id })
    if (!sub?.apiAccess) return

    return { user }
  }

  if (config.apiAccess === 'users') return { user }
}

export async function findByPatreonUserId(id: string) {
  const user = await db('user').findOne({ patreonUserId: id })
  return user
}

export async function findByGoogleSub(id: string) {
  const user = await db('user').findOne({ 'google.sub': id })
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

export async function unlinkPatreonAccount(userId: string, reason: string) {
  const user = await getUser(userId)

  if (!user?.patreon || !user?.patreonUserId) {
    return
  }

  await store.users.updateUser(userId, { patreon: null as any, patreonUserId: null as any })
  await command.patron.unlink(user.patreonUserId, { userId, reason })
}

export function toSafeUser(user: AppSchema.User, seed?: string) {
  if (user.patreon) {
    user.patreon.access_token = ''
    user.patreon.refresh_token = ''
    user.patreon.scope = ''
    user.patreon.token_type = ''
  }

  if (user.google) {
    user.google = {
      sub: user.google.sub,
    } as any
  }

  if (user.novelApiKey) {
    user.novelApiKey = ''
  }

  if (user.hordeKey) {
    if (seed) {
      const key = decryptText(user.hordeKey, true)
      user.hordeKey = encryptUserText(key, seed)
    } else user.hordeKey = ''
  }
  user.apiKey = user.apiKey ? '*********' : 'Not set'

  if (user.oaiKey) {
    user.oaiKeySet = true
    user.oaiKey = ''
  }

  if (user.mistralKey) {
    user.mistralKeySet = true
    user.mistralKey = ''
  }

  if (user.scaleApiKey) {
    user.scaleApiKeySet = true
    user.scaleApiKey = ''
  }

  if (user.claudeApiKey) {
    user.claudeApiKey = ''
    user.claudeApiKeySet = true
  }

  if (user.thirdPartyPassword) {
    user.thirdPartyPassword = ''
    user.thirdPartyPasswordSet = true
  }

  if (user.elevenLabsApiKey) {
    user.elevenLabsApiKey = ''
    user.elevenLabsApiKeySet = true
  }

  if (user.arliApiKey) {
    user.arliApiKey = ''
    user.arliApiKeySet = true
  }

  for (const svc of getRegisteredAdapters()) {
    if (!user.adapterConfig) break
    if (!user.adapterConfig[svc.name]) continue

    const secrets = svc.settings.filter((opt) => opt.secret)

    for (const secret of secrets) {
      if (user.adapterConfig[svc.name]![secret.field]) {
        user.adapterConfig[svc.name]![secret.field] = ''
        user.adapterConfig[svc.name]![secret.field + 'Set'] = true
      }
    }
  }

  const sub = getUserSubscriptionTier(user, getCachedTiers())
  if (sub) {
    user.sub = {
      ...sub,
      tierId: sub.tier?._id,
    }
  }

  return user
}
