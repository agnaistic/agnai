import { v4 } from 'uuid'
import { getStore } from '../create'
import { getInferencePreset, replaceUniversalTags } from './common'
import { localApi } from './storage'
import { JsonField, TickHandler } from '/common/prompt'
import { AppSchema } from '/common/types'
import { api, getAuthHeaders } from '../api'
import { toastStore } from '../toasts'
import { createSignal, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { getEncoder } from '/common/tokenize'
import { msgsApi } from './messages'
import { parseTemplate } from '/common/template-parser'
import { extractReasoning } from '/common/reasoning'
import { applog } from '/common/debug'
import { tryParse } from '/common/util'

const inferenceCallbacks = new Map<string, TickHandler>()

export const genApi = {
  guidance,
  basicInference,
  inferenceStream,
  callbacks: inferenceCallbacks,
  subscribe: inferenceSubscribe,
  cancellableStream,
  inferenceSignal,
}

type InferenceOpts = {
  signal?: AbortController
  prompt?: string
  messages?: Array<{ role: string; content: any }>
  settings?: Partial<AppSchema.GenSettings>
  overrides?: Partial<AppSchema.GenSettings>
  maxTokens?: number
  jsonSchema?: JsonField[]

  /** Base64 image */
  image?: string
}

type InferenceStatus = 'idle' | 'loading' | 'error'
export function inferenceSignal(init: {
  preset?: AppSchema.GenSettings
  schema?: JsonField[]
  onTick?: TickHandler
  maxContext?: number
}) {
  const [ctrl, setCtrl] = createSignal<AbortController>()
  const [state, setState] = createStore({
    status: 'idle' as InferenceStatus,
    response: '',
    error: '',
    preset: init.preset,
    schema: init.schema,
    maxContext: init.maxContext || 0,
    thoughts: [] as string[],
  })

  const onTick: TickHandler = (response, tick) => {
    if (state.status !== 'loading') return

    const parsed = extractReasoning(response || '', { tags: state.preset?.reasoning })

    switch (tick) {
      case 'error': {
        setState({ status: 'error', error: response })
        setCtrl()
        init.onTick?.(response, tick)
        return
      }

      case 'partial': {
        setState({
          response: parsed.content,
          thoughts: parsed.thoughts,
        })
        break
      }

      case 'done': {
        const parsed = extractReasoning(response, { tags: state.preset?.reasoning })
        setState({
          status: 'idle',
          response: parsed.content,
          thoughts: parsed.thoughts,
        })
        setCtrl()
        break
      }
    }

    init.onTick?.(parsed.content, tick)
  }

  const generate = async (opts: {
    prompt: string
    image?: string
    preset?: AppSchema.GenSettings
    schema?: JsonField[]
    maxContext?: number
  }) => {
    if (opts.preset) setState({ preset: opts.preset })
    if (opts.schema) setState({ schema: opts.schema })
    if (opts.maxContext) setState({ maxContext: opts.maxContext })

    const preset = opts.preset || state.preset
    const schema = opts.schema || state.schema

    const active = await msgsApi.getActiveTemplateParts()
    active.limit = {
      context: opts.maxContext! || preset?.maxContextLength!,
      encoder: await getEncoder(),
    }
    const parsed = await parseTemplate(opts.prompt, active)

    const stream = genApi.cancellableStream(
      {
        prompt: opts.prompt,
        messages: parsed.blocks.length ? parsed.blocks : undefined,
        image: opts.image,
        settings: preset,
        jsonSchema: schema,
      },
      onTick
    )

    setCtrl(stream.signal)
    setState({ status: 'loading' })
  }

  const cancel = () => {
    if (state.status !== 'loading') return
    const signal = ctrl()
    if (!signal) return

    applog('cancelling stream')
    setState({ status: 'idle' })
    signal.abort()
    setCtrl()
  }

  onCleanup(() => {
    cancel()
  })

  return {
    state,
    cancel,
    send: generate,
    update: (next: {
      preset?: AppSchema.GenSettings
      schema?: JsonField[]
      maxContext?: number
    }) => {
      setState(next)
    },
  }
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

  if (prompt) {
    prompt = replaceUniversalTags(prompt, preset.modelFormat)
  }

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

export function cancellableStream(opts: InferenceOpts, onTick?: TickHandler) {
  const signal = new AbortController()

  const promise = inferenceStream({ ...opts, signal }, onTick)

  return { cancel: () => signal.abort(), promise, signal }
}

export async function inferenceStream(opts: InferenceOpts, onTick?: TickHandler) {
  let { overrides, settings, prompt } = opts
  const requestId = v4()
  const { user } = getStore('user').getState()

  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return localApi.result({ response: '' })
  }

  let preset = getInferencePreset(settings)
  if (preset && overrides) {
    preset = Object.assign({}, preset, overrides)
  }

  if (prompt) {
    prompt = replaceUniversalTags(prompt, preset.modelFormat)
  }

  const lazy = lazyPromise<{ response: string }>()

  let lastResponse = ''

  const payload = {
    requestId,
    user,
    prompt,
    messages: opts.messages,
    imageData: opts.image,
    jsonSchema: opts.jsonSchema,
    settings: { ...preset, stream: true },
  }

  const tickWrapper: TickHandler = (res, state) => {
    if (state === 'partial') {
      lastResponse = res
    }

    if (state === 'done') {
      if (typeof res !== 'string') lazy.resolve(res)
      else lazy.resolve({ response: res })
    }

    if (state === 'error') {
      lazy.reject(res)
    }

    onTick?.(res, state)
  }

  if (opts.signal) {
    opts.signal.signal.onabort = () => {
      inferenceCallbacks.delete(requestId)
      lazy.resolve({ response: lastResponse })
    }

    api.fetchSSE({
      path: '/chat/inference-stream',
      headers: getAuthHeaders(),
      body: payload,
      signal: opts.signal,
      onTick: (payload) => {
        if (!payload.data) return
        const json = tryParse(payload.data)
        if (!json) return

        switch (json.type) {
          case 'inference-partial': {
            tickWrapper(json.partial, 'partial')
            break
          }

          case 'inference-error': {
            tickWrapper(json.error, 'error')
            break
          }

          case 'inference': {
            tickWrapper(json.response, 'done')
            break
          }

          case 'inference-warning': {
            tickWrapper(json.warning, 'warning')
            break
          }
        }
      },
    })

    return lazy.promise
  }

  inferenceCallbacks.set(requestId, tickWrapper)

  const res = await api.method<{ requestId: string; generating: boolean }>(
    'post',
    `/chat/inference-stream`,
    payload
  )

  if (res.error) {
    onTick?.(res.error, 'error')
  }

  if (!res.result?.generating) {
    inferenceCallbacks.delete(requestId)
  }

  return lazy.promise
}

export function lazyPromise<T = any>() {
  const parts = {
    resolve: (result: T) => {},
    reject: (error: any) => {},
    promise: {} as any as Promise<{ result?: T; error?: any }>,
  }

  parts.promise = new Promise<{ result?: T; error?: any }>((resolve, _reject) => {
    parts.resolve = (result: any) => {
      resolve({ result, error: undefined })
    }
    parts.reject = (error: any) => {
      resolve({ result: undefined, error })
    }
  })

  return parts
}
