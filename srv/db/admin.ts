import { Filter } from 'mongodb'
import { db } from './client'
import { encryptPassword } from './util'
import { AppSchema } from '../../common/types/schema'
import { getDb } from './client'
import { domain } from '../domains'

type UsersOpts = {
  username?: string
  page?: number
  subscribed?: boolean
  customerId?: string
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
      filters.push({ 'sub.level': { $gt: -1 } })
    }

    if (opts.customerId) {
      filters.push({ 'billing.customerId': opts.customerId })
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
    { projection: { username: 1, sub: 1, billing: 1 } }
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

export async function getConfig(): Promise<any> {
  const cfg = await getDb().collection('configuration').findOne()
  if (!cfg) {
    await getDb().collection('configuration').insertOne({ slots: {} })
    return {}
  }

  return cfg
}
