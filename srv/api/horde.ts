import { Router } from 'express'
import { get } from './request'
import { handle } from './wrap'

export const HORDE_GUEST_KEY = '0000000000'

const router = Router()

const CACHE_TTL_MS = 120000
let LAST_CACHED = 0

let TEXT_CACHE: Model[] = []
let IMAGE_CACHE: Model[] = []

export const getModels = handle(async (req) => {
  const diff = Date.now() - LAST_CACHED
  const bustCache = diff > CACHE_TTL_MS || TEXT_CACHE.length === 0

  if (!bustCache) {
    return { models: TEXT_CACHE }
  }

  const url = `/status/models`

  const [kobold, horde] = await Promise.all([
    get<Model[]>({ type: 'kobold', url }),
    get<Model[]>({ type: 'horde', url }),
  ])

  TEXT_CACHE = horde.concat(kobold).filter((model) => model.type !== 'image')
  IMAGE_CACHE = horde.concat(kobold).filter((model) => model.type === 'image')

  return { models: TEXT_CACHE }
})

router.get('/models', getModels)

export default router

type Model = {
  name: string
  count: number
  performance: number
  queued: number
  eta: number
  type?: string
}

export async function findUser(apikey: string) {
  const [horde, kobold] = await Promise.allSettled([
    get<FindUserResponse>({ url: `/find_user`, type: 'horde', apikey }),
    get<FindUserResponse>({ url: `/find_user`, type: 'kobold', apikey }),
  ])

  if (horde.status === 'fulfilled') {
    return { ...horde.value, type: 'horde' as const }
  }

  if (kobold.status === 'fulfilled') {
    return { ...kobold.value, type: 'kobold' as const }
  }

  throw new Error(`User not found`)
}

export type FindUserResponse = {
  kudos_details: {
    accumulated: number
    gifted: number
    admin: number
    received: number
    recurring: number
  }
  usage: {
    tokens: number
    requests: number
  }
  contributions: {
    tokens: number
    fulfillments: number
  }
  username: string
  id: number
  kudos: number
  concurrency: number
  worker_invited: number
  moderator: boolean
  worker_count: number
  worker_ids: string[]
  trusted: number
  pseudonymous: number
}
