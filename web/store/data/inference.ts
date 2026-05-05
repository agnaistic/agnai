import { v4 } from 'uuid'
import { getStore } from '../create'
import { getInferencePreset, replaceUniversalTags } from './common'
import { localApi } from './storage'
import { JsonField, TickHandler } from '/common/prompt'
import { AppSchema } from '/common/types'
import { api, getAuthHeaders } from '../api'
import { toastStore } from '../toasts'
import { onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { getEncoder } from '/common/tokenize'
import { msgsApi } from './messages'
import { parseTemplate } from '/common/template-parser'
import { extractReasoning } from '/common/reasoning'
import { applog, debug } from '/common/debug'
import { replaceTags } from '/common/presets/templates'
import { getProvider } from '../preset-context'
import { getProviderConnection } from '/common/providers'
import { getLocalPayload } from '/common/requests/payloads'
import { lazyPromise } from '/common/util'

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
  chatId?: string
  jsonSchema?: JsonField[]
  stop?: string[]

  broadcast?: { type: string; id: string; payload: any }

  /** Base64 image */
  image?: string
  payload?: any
}

type InferenceStatus = 'idle' | 'loading' | 'error'

type InferenceState = {
  status: InferenceStatus
  response: string
  error: string
  preset?: Partial<AppSchema.GenSettings>
  schema?: JsonField[]
  maxContext: number
  thoughts: string[]
  signal: AbortController | null
}

const initState = (init?: {
  preset?: Partial<AppSchema.GenSettings>
  schema?: JsonField[]
  maxContext?: number
}): InferenceState => ({
  status: 'idle',
  response: '',
  error: '',
  preset: init?.preset,
  schema: init?.schema,
  maxContext: init?.maxContext || 0,
  thoughts: [],
  signal: null as AbortController | null,
})

export function inferenceHelper(init: {
  chatId?: string
  preset?: Partial<AppSchema.GenSettings>
  schema?: JsonField[]
  onTick?: TickHandler
  onState?: (next: InferenceState) => void
  maxContext?: number
}) {
  const state: InferenceState = initState(init)

  const getState = () => ({ ...state })

  const setState = (partial: Partial<typeof state>) => {
    Object.assign(state, partial)
    init.onState?.(getState())
  }

  const onTick: TickHandler = (response, tick) => {
    if (state.status !== 'loading') return

    const parsed = extractReasoning(response || '', { tags: state.preset?.reasoning })

    switch (tick) {
      case 'error': {
        setState({ status: 'error', error: response, signal: null })
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
          signal: null,
        })
        break
      }
    }

    init.onTick?.(parsed.content, tick)
  }

  const generate = async (opts: {
    signal?: AbortController
    prompt: string
    image?: string
    chatId?: string
    preset?: Partial<AppSchema.GenSettings>
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
    parsed.parsed = replaceTags(parsed.parsed, preset?.modelFormat || 'None')

    const stream = genApi.cancellableStream(
      {
        prompt: parsed.parsed,
        messages: parsed.blocks.length ? parsed.blocks : undefined,
        image: opts.image,
        settings: preset,
        jsonSchema: schema,
        signal: opts.signal,
        chatId: init.chatId || opts.chatId,
      },
      onTick
    )

    setState({ status: 'loading', signal: stream.signal })

    return stream
  }

  const cancel = () => {
    if (state.status !== 'loading') return
    if (!state.signal) return

    applog('cancelling stream')
    state.signal.abort()
    setState({ status: 'idle', signal: null })
  }

  return { getState, setState, send: generate, cancel }
}

export function inferenceSignal(init: {
  preset?: AppSchema.GenSettings
  schema?: JsonField[]
  onTick?: TickHandler
  maxContext?: number
}) {
  const helper = inferenceHelper({ ...init, onState: (next) => setState(next) })
  const [state, setState] = createStore(helper.getState())

  onCleanup(() => {
    helper.cancel()
  })

  return {
    state,
    cancel: helper.cancel,
    send: helper.send,
    update: (next: {
      preset?: AppSchema.GenSettings
      schema?: JsonField[]
      maxContext?: number
    }) => {
      helper.setState(next)
    },
  }
}

export function inferenceSubscribe(requestId: string, handler: TickHandler) {
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
  const signal = opts.signal || new AbortController()

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
    stop: opts.stop,
    chatId: opts.chatId,
  }

  const provider = getProvider(settings?.providerId)
  const conn = provider ? getProviderConnection(provider) : undefined

  const tickWrapper: TickHandler = (res, state, json) => {
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

    onTick?.(res, state, json)
  }

  if (opts.signal) {
    opts.signal.signal.onabort = () => {
      inferenceCallbacks.delete(requestId)
      tickWrapper(lastResponse, 'done')
      // lazy.resolve({ response: lastResponse })
    }
  }
  if (conn?.local) {
    const headers: any = {}
    const key = provider?.userKey || opts.settings?.thirdPartyKey
    if (key) {
      headers.Authorization = `Bearer ${key}`
      headers['x-api-key'] = `${key}`
    }
    if (!opts.payload) {
      debug('sse')('warning: no local payload provided, using fallback')
    }

    const fallback = getLocalPayload({
      user,
      messages: opts.messages,
      prompt: opts.prompt,
      settings: preset,
    })
    api.localSSE({
      host: conn?.url,
      path: payload.messages ? `/chat/completions` : '/completions',
      body: opts.payload || fallback,
      headers,
      signal: opts.signal,
      onTick: tickWrapper,
    })
  } else {
    api.fetchSSE({
      path: '/chat/inference-stream',
      headers: getAuthHeaders(),
      body: payload,
      signal: opts.signal,
      onTick: tickWrapper,
    })
  }

  return lazy.promise
}
