import { ImageProviderType } from '/common/types/image-schema'
import { ImageContext } from './image-context'
import { settingStore } from '/web/store'
import { NOVEL_IMAGE_MODEL } from '/common/image'
import { createResource } from 'solid-js'
import { imageApi } from '/web/store/data/image'

export function useModelList(ctx: ImageContext) {
  const res = createResource(ctx.current.provider, async (prv) => {
    const list = await retrieveImageModels(prv)
    return list
  })

  return res
}

export async function retrieveImageModels(opts: {
  _id: string
  type: ImageProviderType
  local?: boolean
  url: string
}) {
  const type = opts.type

  switch (type) {
    case 'agnai': {
      const list = settingStore.getState().config.serverConfig?.imagesModels || []
      const models = list.map((m) => ({ label: `${m.desc.trim()}`, value: m.id || m.name }))
      return models
    }

    case 'horde': {
      const imageWorkers = settingStore.getState().imageWorkers
      const map = new Map<string, number>()

      for (const worker of imageWorkers) {
        for (const model of worker.models) {
          if (!map.has(model)) {
            map.set(model, 0)
          }

          const current = map.get(model) ?? 0
          map.set(model, current + 1)
        }
      }

      const items = Array.from(map.entries())
        .sort(([, l], [, r]) => (l > r ? -1 : l === r ? 0 : 1))
        .map(([name, count]) => ({
          label: `${name} (${count})`,
          value: name,
        }))

      return items
    }

    case 'novel': {
      const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({
        label: `${key}`,
        value,
      }))

      return models
    }

    case 'swarm': {
      const result = await imageApi.getImageModelList({
        type: 'swarm',
        providerId: opts._id,
        local: opts.local,
        url: opts.url,
      })

      const options = result.models.map((model) => ({ label: model.title, value: model.title }))
      return options
    }

    case 'sd':
    case 'openai': {
      const result = await imageApi.getImageModelList({
        type: 'sd',
        providerId: opts._id,
        local: opts.local,
        url: opts.url,
      })

      const options = result.models.map((model) => ({ label: model.title, value: model.title }))
      return options
    }

    default: {
      return []
    }
  }
}
