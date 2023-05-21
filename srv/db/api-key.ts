import bcrypt from 'bcryptjs'
import { config } from '../config'
import { db } from './client'
import { AppSchema } from './schema'

export async function createApiKey(userId: string, name: string, scopes: string[]) {
  const key = crypto.randomUUID()
  const hashed = await bcrypt.hash(key, config.apiKeySecret)
  const apiKey: AppSchema.ApiKey = {
    kind: 'api-key',
    userId,
    name,
    scopes,
    key: hashed,
  }

  await db('api-key').insertOne(apiKey)
  return { ...apiKey, key }
}

export async function deleteApiKey(userId: string, key: string) {
  await db('api-key').deleteOne({ key, userId })
  return
}

export async function getApiKeys(userId: string) {
  const apiKey = await db('api-key')
    .find({ userId })
    .project({
      userId: 1,
      name: 1,
      scopes: 1,
    })
    .toArray()
  return apiKey
}

export async function getApiKeyByKey(key: string) {
  const hashed = await bcrypt.hash(key, config.apiKeySecret)
  const apiKey = await db('api-key').findOne(
    { key: hashed },
    { projection: { userId: 1, scopes: 1 } }
  )
  return apiKey
}
