import { Filter } from 'mongodb'
import { db } from './client'
import { encryptPassword } from './util'
import { AppSchema } from '../../common/types/schema'
import { domain } from '../domains'
import { config } from '../config'

type UsersOpts = {
  username?: string
  page?: number
  subscribed?: boolean
  customerId?: string
}

export async function getServerConfiguration() {
  const cfg = await db('configuration').findOne({ kind: 'configuration' })
  if (cfg) return cfg

  const next: AppSchema.Configuration = {
    kind: 'configuration',
    apiAccess: 'off',
    enabledAdapters: [],
    maintenance: !!config.ui.maintenance,
    maintenanceMessage: config.ui.maintenance || '',
    policiesEnabled: config.ui.policies,
    privacyStatement: '',
    privacyUpdated: new Date().toISOString(),
    slots: '',
    termsOfService: '',
    tosUpdated: new Date().toISOString(),
    imagesEnabled: false,
    imagesHost: '',
    imagesModels: [],
    supportEmail: '',
    ttsAccess: 'off',
    ttsApiKey: '',
    ttsHost: '',
    maxGuidanceTokens: 1000,
    maxGuidanceVariables: 15,
    googleClientId: '',
    googleEnabled: false,
    actionCalls: [],
    lockSeconds: 0,
    stripeCustomerPortal: '',
  }

  await db('configuration').insertOne(next)
  return next
}

export async function updateServerConfiguration(update: Partial<AppSchema.Configuration>) {
  await db('configuration').updateOne({ kind: 'configuration' }, { $set: update }, { upsert: true })
  const cfg = await getServerConfiguration()
  return cfg
}

export async function getUsers(opts: UsersOpts = {}) {
  const filter: Filter<AppSchema.User> = {}
  const skip = (opts.page || 0) * 200

  if (opts.username || opts.subscribed || opts.customerId) {
    const filters: (typeof filter)['$or'] = []

    if (opts.username) {
      filters.push(
        { username: { $regex: new RegExp(opts.username.trim(), 'gi') } },
        { _id: opts.username.trim() }
      )
    }

    if (opts.subscribed) {
      filters.push({ $or: [{ 'sub.level': { $gt: -1 } }, { 'patreon.sub.level': { $gt: -1 } }] })
    }

    if (opts.customerId) {
      filters.push({ 'billing.customerId': opts.customerId })
      filters.push({ patreonUserId: opts.customerId })
      filters.push({ 'patreon.user.attributes.email': opts.customerId })
      filters.push({ 'google.email': opts.customerId })
    }

    filter.$or = filters
  }

  const list = await db('user').find(filter).skip(skip).limit(200).toArray()
  return list
}

export async function changePassword(opts: { userId: string; password: string }) {
  const hash = await encryptPassword(opts.password)
  await db('user').updateOne({ _id: opts.userId }, { $set: { hash } })
  return true
}

export async function getUserInfo(userId: string) {
  const billing = await db('user').findOne(
    { _id: userId },
    {
      projection: {
        username: 1,
        sub: 1,
        manualSub: 1,
        billing: 1,
        patreon: 1,
        stripeSessions: 1,
        google: 1,
      },
    }
  )
  const profile = await db('profile').findOne({ userId })
  const chats = await db('chat').countDocuments({ userId })
  const characters = await db('character').countDocuments({ userId })
  const state = await domain.subscription.getAggregate(userId)

  return {
    userId,
    chats,
    characters,
    handle: profile?.handle,
    avatar: profile?.avatar,
    state,
    ...billing,
  }
}
