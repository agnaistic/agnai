import { config } from '../config'
import { wait } from '../db/util'
import { logger } from '../middleware'

type V1Model = {
  id: string
  name: string
  owned_by: string
  updated_at: string
  model_class: string
  context_length: number
  max_completion_tokens: number
  available_on_current_plan: boolean
}

export type FeatherlessModel = {
  id: string
  name: string
  model_class: string
  status: 'active' | 'not_deployed' | 'pending_deploy'
  health?: 'OFFLINE' | 'UNHEALTHY' | 'HEALTHY'

  ctx: number
  res: number
  plan: boolean

  created?: string
}

let modelCache: FeatherlessModel[] = []
let classCache: Record<string, { ctx: number; res: number }> = {}
const FEATHERLESS_HEADERS = {
  accept: 'application/json',
  'user-agent': 'Agnai/1.0 (+https://github.com/agnaistic/agnai)',
}

export function getFeatherModels() {
  return { models: modelCache, classes: classCache }
}

async function getModelList() {
  if (config.inference.skipModelLists) return []

  try {
    const models = await fetch('https://api.featherless.ai/v1/models', {
      headers: FEATHERLESS_HEADERS,
      method: 'GET',
    })

    const payload = await parseJsonResponse<{ data?: V1Model[] }>(models, 'Featherless model list')
    if (!payload) {
      return modelCache
    }

    const list = payload.data as V1Model[] | undefined
    if (!list?.length) {
      logger.warn(`Featherless model list returned no models`)
      return modelCache
    }

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

    const classes = await getModelClasses()

    if (classes?.length) {
      for (const item of classes) {
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

      modelCache = classes
    }

    return classes
  } catch (ex) {
    logger.warn({ err: ex }, `Featherless model list failed`)
  } finally {
    await wait(60000 * 10)
    getModelList()
  }
}

async function getModelClasses() {
  let page = 1
  const all: any[] = []

  while (true) {
    try {
      const res = await fetch(`https://api.featherless.ai/feather/models?page=${page}&perPage=50`, {
        headers: FEATHERLESS_HEADERS,
        method: 'GET',
      })

      if (res.status > 200) {
        const text = await res.text().catch(() => 'Could not parse')
        logger.warn(
          { warning: text, page },
          `Featherless model classes failed: ${res.status} ${res.statusText}`
        )

        await wait(3000)
        continue
      }

      const json = await parseJsonResponse<{ items?: any[] }>(res, 'Featherless model classes', {
        page,
      })
      if (!json?.items) {
        await wait(3000)
        continue
      }

      const items = json?.items

      if (items.length) {
        all.push(...items)
      }

      if (items.length < 50) break
      await wait(4000)
      page++
    } catch (ex: any) {
      logger.warn(`Featherless model classes failed: ${ex.message || ex}`)
      return
    }
  }

  return all
}

async function parseJsonResponse<T>(
  res: Response,
  label: string,
  extra: Record<string, unknown> = {}
): Promise<T | undefined> {
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!res.ok) {
    logger.warn(
      {
        ...extra,
        status: res.status,
        statusText: res.statusText,
        warning: text.slice(0, 500),
      },
      `${label} failed`
    )
    return
  }

  if (!contentType.includes('application/json')) {
    logger.warn(
      {
        ...extra,
        status: res.status,
        contentType,
        warning: text.slice(0, 500),
      },
      `${label} returned non-JSON content`
    )
    return
  }

  try {
    return JSON.parse(text) as T
  } catch (ex: any) {
    logger.warn(
      {
        ...extra,
        err: ex,
        status: res.status,
        contentType,
        warning: text.slice(0, 500),
      },
      `${label} returned invalid JSON`
    )
    return
  }
}

getModelList()
