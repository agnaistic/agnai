import { Router } from 'express'
import { errors, handle } from './wrap'
import { store } from '../db'
import { assertValid } from 'frisker'

const router = Router()

const validApiKey = {
  name: 'string',
  scopes: ['string'],
} as const

const createApiKey = handle(async ({ body, userId }) => {
  if (!userId) return errors.Unauthorized
  assertValid(validApiKey, body)
  const key = await store.apiKey.createApiKey(userId, body.name, body.scopes)
  return key
})

const getApiKeys = handle(async ({ userId }) => {
  if (!userId) return errors.Unauthorized
  const keys = await store.apiKey.getApiKeys(userId)
  return { keys }
})

const deleteApiKey = handle(async ({ userId, params }) => {
  if (!userId) return errors.Unauthorized
  if (!params.id) return errors.BadRequest
  await store.apiKey.deleteApiKey(userId, params.id)
  return { success: true }
})

router.get('/', getApiKeys)
router.post('/', createApiKey)
router.delete('/:id', deleteApiKey)
