import { logger } from '../middleware'

export type FeatherlessModel = {
  id: string
  created_at: string
  updated_at: string
  name: string
  owned_by: string
  model_class: string
  favorites: number
  downloads: number
  status: 'active' | 'not_deployed' | 'pending_deploy'
  health?: 'OFFLINE' | 'UNHEALTHY' | 'HEALTHY'
  avg_rating: number
  total_reviews: number
}

let modelCache: FeatherlessModel[] = []

export function getFeatherModels() {
  return modelCache
}

async function getModelList() {
  const res = await fetch('https://api.featherless.ai/feather/models?page=1&perPage=5000', {
    headers: {
      accept: '*/*',
    },
    method: 'GET',
  })

  if (res.status && res.status > 200) {
    return
  }

  try {
    const json = (await res.json()) as { items: FeatherlessModel[] }

    if (json.items.length) {
      modelCache = json.items
    }

    return json
  } catch (ex) {
    logger.warn({ err: ex, body: res.body, status: res.status }, `Featherless model list failed`)
  }
}

getModelList()

setInterval(getModelList, 120000)
