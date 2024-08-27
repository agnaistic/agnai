import { v4 } from 'uuid'
import { getStore } from '../create'
import { getInferencePreset, replaceUniversalTags } from './common'
import { localApi } from './storage'
import { InferenceState, JsonField, TickHandler } from '/common/prompt'
import { AppSchema } from '/common/types'
import { api } from '../api'
import { toastStore } from '../toasts'

const inferenceCallbacks = new Map<string, TickHandler>()

export const genApi = {
  guidance,
  basicInference,
  inferenceStream,
  callbacks: inferenceCallbacks,
  subscribe: inferenceSubscribe,
}

type InferenceOpts = {
  prompt: string
  settings?: Partial<AppSchema.GenSettings>
  overrides?: Partial<AppSchema.GenSettings>
  maxTokens?: number
  jsonSchema?: JsonField[]

  /** Base64 image */
  image?: string
}

export function inferenceSubscribe<T = any>(requestId: string, handler: TickHandler<T>) {
  inferenceCallbacks.set(requestId, handler)

  setTimeout(() => {
    inferenceCallbacks.delete(requestId)
  }, 60000 * 5)
}

export async function guidance<T = any>(
  opts: InferenceOpts & {
    requestId?: string
    presetId?: string
    previous?: any
    lists?: Record<string, string[]>
    placeholders?: Record<string, string | string[]>
    rerun?: string[]
  }
): Promise<T> {
  const { prompt, maxTokens, settings, previous, lists, rerun, placeholders } = opts
  const requestId = opts.requestId || v4()
  const { user } = getStore('user').getState()

  if (!user) {
    throw new Error(`Could not get user settings. Refresh and try again.`)
  }

  const res = await api.method<{ result: string; values: T }>('post', `/chat/guidance`, {
    requestId,
    user,
    presetId: opts.presetId,
    settings: opts.presetId ? undefined : getInferencePreset(settings),
    prompt,
    maxTokens,
    previous,
    lists,
    placeholders,
    reguidance: rerun,
  })

  if (res.error) {
    throw new Error(res.error)
  }

  return res.result!.values
}

export async function basicInference(opts: InferenceOpts) {
  let { overrides, settings, prompt, image } = opts
  const requestId = v4()
  const { user } = getStore('user').getState()

  if (!user) {
    return localApi.error(`Could not get user settings. Refresh and try again.`)
  }

  let preset = getInferencePreset(settings)
  if (preset && overrides) {
    preset = Object.assign({}, preset, overrides)
  }

  prompt = replaceUniversalTags(prompt, preset.modelFormat)

  const res = await api.method<{ response: string; meta: any }>('post', `/chat/inference`, {
    requestId,
    user,
    prompt,
    imageData: image,
    jsonSchema: opts.jsonSchema,
    settings: { ...preset, stream: false },
  })

  return res
}

export async function inferenceStream(
  opts: InferenceOpts,
  onTick: (msg: string, state: InferenceState) => any
) {
  let { overrides, settings, prompt } = opts
  const requestId = v4()
  const { user } = getStore('user').getState()

  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return
  }

  let preset = getInferencePreset(settings)
  if (preset && overrides) {
    preset = Object.assign({}, preset, overrides)
  }

  prompt = replaceUniversalTags(prompt, preset.modelFormat)

  inferenceCallbacks.set(requestId, onTick)

  const res = await api.method<{ requestId: string; generating: boolean }>(
    'post',
    `/chat/inference-stream`,
    {
      requestId,
      user,
      prompt,
      imageData: opts.image,
      jsonSchema: opts.jsonSchema,
      settings: { ...preset, stream: true },
    }
  )

  if (res.error) {
    onTick(res.error, 'error')
  }

  if (!res.result?.generating) {
    inferenceCallbacks.delete(requestId)
  }
}
