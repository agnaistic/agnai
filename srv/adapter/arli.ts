import { logger } from '../middleware'

type V1Model = {
  name: string
  promptFormat: string
  contextSize: string
  modelLink: string
  modelSize: string
  status: boolean
}

export type ArliModel = {
  id: string
  name: string
  model_class: string
  status: 'active' | 'not_deployed' | 'pending_deploy'
  health?: 'OFFLINE' | 'UNHEALTHY' | 'HEALTHY'

  ctx: number
  res: number
}

let modelCache: ArliModel[] = []
let classCache: Record<string, { ctx: number; res: number }> = {}

export function getArliModels() {
  return { models: modelCache, classes: classCache }
}

async function getModelList() {
  try {
    const models = await fetch('https://api.arliai.com/model/all', {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
    })

    const next: ArliModel[] = []

    if (models.status && models.status > 200) {
      const body = await models.json()
      logger.warn({ body, status: models.status }, `ArliAI model list failed`)
      return
    }

    const map = await models.json().then((res) => {
      const list = res as V1Model[]
      if (!list) return {}

      const map: { [key: string]: V1Model } = {}
      for (const model of list) {
        if (!classCache[model.modelSize]) {
          classCache[model.modelSize] = {
            ctx: +model.contextSize,
            res: 500,
          }
        }

        next.push({
          id: model.name,
          model_class: model.modelSize,
          name: model.name,
          res: 500,
          status: model.status ? 'active' : 'not_deployed',
          ctx: +model.contextSize,
        })

        map[model.name] = model
      }
      return map
    })

    modelCache = next

    return map
  } catch (ex) {
    logger.error({ err: ex }, `Featherless model list failed`)
  }
}

getModelList()

setInterval(getModelList, 120000)
