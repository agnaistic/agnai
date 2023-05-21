import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { config } from '../config'
import { db } from './client'
import { AppSchema } from './schema'
import { v4 } from 'uuid'
import { now } from './util'

export async function createApiKey(userId: string, name: string, scopes: string[]) {
  const key = crypto.randomBytes(32).toString('hex')
  const hashed = await bcrypt.hash(key, config.apiKeySalt)
  const apiKey: AppSchema.ApiKey = {
    kind: 'api-key',
    _id: v4(),
    userId,
    name,
    scopes,
    key: hashed,
    createdAt: now(),
  }

  await db('api-key').insertOne(apiKey)
  return { ...apiKey, key }
}

export async function deleteApiKey(userId: string, id: string) {
  const result = await db('api-key').deleteOne({ _id: id, userId })
  if (result.deletedCount !== 1) throw new Error('Could not find API key')
}

export async function getApiKeys(userId: string) {
  const apiKey = await db('api-key')
    .find({ userId })
    .project({
      key: 0,
    })
    .toArray()
  return apiKey
}

export async function getApiKeyByKey(key: string) {
  const hashed = await bcrypt.hash(key, config.apiKeySalt)
  const apiKey = await db('api-key').findOne({ key: hashed }, { projection: { key: 0 } })
  return apiKey
}
