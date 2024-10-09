import { logger } from '../middleware'

type V1Model = {
  id: string
  name: string
  owned_by: string
  updated_at: string
  model_class: string
  context_length: number
  max_completion_tokens: number
}

export type FeatherlessModel = {
  id: string
  name: string
  model_class: string
  status: 'active' | 'not_deployed' | 'pending_deploy'
  health?: 'OFFLINE' | 'UNHEALTHY' | 'HEALTHY'

  ctx: number
  res: number

  created_at?: string
  updated_at?: string
  owned_by?: string
  avg_rating?: number
  total_reviews?: number
  favorites?: number
  downloads?: number
}

let modelCache: FeatherlessModel[] = []
let classCache: Record<string, { ctx: number; res: number }> = {}

export function getFeatherModels() {
  return { models: modelCache, classes: classCache }
}

async function getModelList() {
  try {
    const models = await fetch('https://api.featherless.ai/v1/models', {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
    })
    const res = await fetch('https://api.featherless.ai/feather/models?page=1&perPage=5000', {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
    })

    if (res.status && res.status > 200) {
      const body = await res.json()
      logger.warn({ body, status: res.status }, `Featherless model list failed`)
      return
    }

    if (models.status && models.status > 200) {
      const body = await models.json()
      logger.warn({ body, status: models.status }, `Featherless model list failed`)
      return
    }

    const map = await models.json().then((res) => {
      const list = res?.data as V1Model[]
      if (!list) return {}

      const map: { [key: string]: V1Model } = {}
      for (const model of list) {
        if (!classCache[model.model_class]) {
          classCache[model.model_class] = {
            ctx: model.context_length,
            res: model.max_completion_tokens,
          }
        }

        map[model.id] = model
      }
      return map
    })

    const json = (await res.json()) as { items: FeatherlessModel[] }

    if (json.items.length) {
      for (const item of json.items) {
        delete item.favorites
        delete item.downloads
        delete item.total_reviews
        delete item.avg_rating
        delete item.updated_at
        delete item.created_at
        const match = map[item.id]
        if (match) {
          item.ctx = match.context_length
          item.res = match.max_completion_tokens
        }
      }

      modelCache = json.items
    }

    return json
  } catch (ex) {
    logger.error({ err: ex }, `Featherless model list failed`)
  }
}

getModelList()

setInterval(getModelList, 120000)
