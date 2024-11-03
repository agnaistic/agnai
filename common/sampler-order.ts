import { AIAdapter } from './adapters'

export const samplerServiceMap: { [adapter in AIAdapter]?: Record<string, number> } = {
  novel: {
    temp: 0,
    topK: 1,
    topP: 2,
    tailFreeSampling: 3,
    topA: 4,
    typicalP: 5,
    cfgScale: 6,
    topG: 7,
    mirostatTau: 8,
  },
  horde: {
    topK: 0,
    topA: 1,
    topP: 2,
    tailFreeSampling: 3,
    typicalP: 4,
    temp: 5,
    repetitionPenalty: 6,
  },
  kobold: {
    topK: 0,
    topA: 1,
    topP: 2,
    tailFreeSampling: 3,
    typicalP: 4,
    temp: 5,
    repetitionPenalty: 6,
  },
}

export const inverseSamplerServiceMap = Object.entries(samplerServiceMap).reduce(
  (prev, [svc, order]) => {
    let map: Record<number, string> = {}
    for (const [key, value] of Object.entries(order)) {
      map[value] = key
    }

    prev[svc as AIAdapter] = map
    return prev
  },
  {} as { [adapter in AIAdapter]?: Record<number, string> }
)

export function toSamplerOrder(
  adapter: AIAdapter,
  samplers: number[] | string | undefined,
  disabled: number[] | string | undefined
) {
  if (!samplers) return

  const next = {
    order: [] as number[],
    disabled: [] as number[],
  }

  if (Array.isArray(samplers)) {
    next.order = samplers
  }

  if (Array.isArray(disabled)) {
    next.disabled = disabled
  }

  const ordering = samplerServiceMap[adapter]
  if (!ordering) {
    return next
  }

  const remove = toSamplers(ordering, disabled)
  const order = toSamplers(ordering, samplers).filter((id) => {
    if (remove.includes(id)) return false
    return true
  })

  return { order, disabled: remove }
}

function toSamplers(map: Record<string, number>, samplers?: number[] | string) {
  if (!samplers) return []

  if (Array.isArray(samplers)) {
    return samplers
  }

  if (typeof samplers !== 'string') return []

  const next: number[] = []
  for (const sampler of samplers.split(',')) {
    const id = +sampler
    if (!isNaN(id)) {
      next.push(id)
      continue
    }

    const match = map[sampler]
    if (match !== undefined) {
      next.push(match)
      continue
    }
  }

  return next
}
