import { Router } from 'express'
import { HordeModel } from '../../common/adapters'
import { get } from './request'
import { handle } from './wrap'

export const HORDE_GUEST_KEY = '0000000000'

const router = Router()

const CACHE_TTL_MS = 120000

let TEXT_CACHE: HordeModel[] = []
let IMAGE_CACHE: HordeModel[] = []

updateModelCache()
setInterval(updateModelCache, CACHE_TTL_MS)

export const getModels = handle(async (req) => {
  return { models: TEXT_CACHE }
})

router.get('/models', getModels)

export default router

export async function findUser(apikey: string) {
  const user = get<FindUserResponse>({ url: `/find_user`, apikey })
  return user
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

async function updateModelCache() {
  const url = `/status/models?type=text`
  const models = await get<HordeModel[]>({ url })
  TEXT_CACHE = models.filter((model) => model.type !== 'image')
}
