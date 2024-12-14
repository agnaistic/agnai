import crypto from 'crypto'
import { AppSchema } from './types/schema'
import { defaultPresets } from './default-preset'
import { SD_SAMPLER } from './image'
import { toArray } from './util'
import type { AppLog } from '../srv/middleware'
import { v4 } from 'uuid'

export const HORDE_SEED = v4()

const ALGO = 'aes256'

const HORDE_GUEST_KEY = '0000000000'
const baseUrl = 'https://aihorde.net/api/v2'

export const defaults = {
  image: {
    sampler: SD_SAMPLER['DPM++ 2M'],
    model: 'Deliberate',
    negative: ``,
  },
}

type FetchOpts = {
  url: string
  method: 'post' | 'get'
  payload?: any
  key?: string
}

type Fetcher = <T = any>(
  opts: FetchOpts
) => Promise<{ statusCode?: number; statusMessage?: string; body: T }>

export type HordeCheck = {
  generations: any[]
  done: boolean
  faulted: boolean
  waiting: number
  restarted: number
  queue_position: number
  is_possible: number
  finished: number
  kudos: number
  wait_time: number
  message?: string
  processing: number
  shared: boolean
}

let TIMEOUT_SECS = Infinity
let fetcher: Fetcher
let logger: AppLog

if (typeof window !== 'undefined') {
  fetcher = async (opts) => {
    const res = await fetch(opts.url, {
      headers: { 'Content-Type': 'application/json', apikey: opts.key || HORDE_GUEST_KEY },
      body: opts.payload ? JSON.stringify(opts.payload) : undefined,
      method: opts.method,
    })

    const json = await res.json()
    return { body: json, statusCode: res.status, statusMessage: res.statusText }
  }
}

async function useFetch<T = any>(opts: FetchOpts) {
  const res = await fetcher<T>(opts).catch((error) => ({ error }))
  if ('error' in res) {
    throw new Error(`Horde request failed: ${res.error}`)
  }

  if (res.statusCode && res.statusCode >= 400) {
    const error: any = new Error(`Horde request failed: ${res.statusMessage}`)
    error.body = res.body
    throw error
  }

  return res
}

export function configure(fn: Fetcher, log: AppLog, timeoutSecs?: number) {
  if (timeoutSecs) {
    TIMEOUT_SECS = timeoutSecs
  }

  logger = log
  fetcher = fn
}

type GenerateOpts = {
  type: 'text' | 'image'
  payload: any
  timeoutSecs?: number
  key: string
  onTick?: (status: HordeCheck) => void
}

export async function generateImage(
  user: AppSchema.User,
  prompt: string,
  negative: string,
  onTick: (status: HordeCheck) => void,
  log: AppLog = logger
) {
  const base = user.images
  const settings = user.images?.horde || defaults.image

  const payload = {
    prompt: `${prompt.slice(0, 500)} ### ${negative}`,
    params: {
      height: base?.height ?? 1024,
      width: base?.width ?? 1024,
      cfg_scale: base?.cfg ?? 9,
      clip_skip: base?.clipSkip,
      denoising_strength: 1,
      karras: false,
      n: 1,
      post_processing: [],
      sampler_name: settings.sampler ?? defaults.image.sampler,
      steps: base?.steps ?? 28,
    },
    censor_nsfw: false,
    nsfw: true,
    models: [settings.model || 'stable_diffusion'],
    r2: false,
    replacement_filter: true,
    trusted_workers: user.hordeUseTrusted ?? false,
  }

  log?.debug({ ...payload, prompt: null }, 'Horde payload')
  log?.debug(`Prompt:\n${payload.prompt}`)

  let key = user.hordeKey
  if (!key) {
    key = HORDE_GUEST_KEY
  } else {
    key = decryptText(user.hordeKey)
  }

  const image = await generate({
    type: 'image',
    payload,
    key,
    onTick,
  })

  if (!image.text.startsWith('data:') && typeof window !== 'undefined') {
    image.text = `data:image/image;base64,${image.text}`
  }

  return image
}

export async function generateText(
  user: AppSchema.User,
  preset: Partial<AppSchema.GenSettings>,
  prompt: string,
  log: AppLog = logger
) {
  const body = {
    // An empty models array will use any model
    models: [] as string[],
    prompt,
    workers: [] as string[],
    trusted_workers: user.hordeUseTrusted ?? true,
  }

  if (user.hordeModel && user.hordeModel !== 'any') {
    const models = toArray(user.hordeModel)
    body.models.push(...models)
  }

  if (user.hordeWorkers?.length) {
    body.workers = user.hordeWorkers
  }

  const params: any = {
    n: 1,
    max_length: Math.min(preset.maxTokens ?? defaultPresets.horde.maxTokens, 512),
    top_a: preset.topA ?? defaultPresets.horde.topA,
    top_k: preset.topK ?? defaultPresets.horde.topK,
    top_p: preset.topP ?? defaultPresets.horde.topP,
    typical: preset.typicalP ?? defaultPresets.horde.typicalP,
    min_p: preset.minP,
    max_context_length: Math.min(
      preset.maxContextLength ?? defaultPresets.horde.maxContextLength,
      2048
    ),
    rep_pen: preset.repetitionPenalty ?? defaultPresets.horde.repetitionPenaltyRange,
    rep_pen_range: preset.repetitionPenaltyRange ?? defaultPresets.horde.repetitionPenaltyRange,
    rep_pen_slope: preset.repetitionPenaltySlope,
    tfs: preset.tailFreeSampling ?? defaultPresets.horde.tailFreeSampling,
    temperature: Math.min(preset.temp ?? defaultPresets.horde.temp, 5),
    smoothing_factor: preset.smoothingFactor,
    dynatemp_range: preset.dynatemp_range,
    dynatemp_exponent: preset.dynatemp_exponent,
  }

  if (preset.order) {
    params.order = preset.order
  }

  const payload = { ...body, params }

  log?.debug({ params: payload, prompt: null }, 'Horde payload')
  log?.debug(`Prompt:\n${payload.prompt}`)

  const result = await generate({
    type: 'text',
    payload: payload,
    key: user.hordeKey || HORDE_GUEST_KEY,
  })
  return result
}

async function generate(opts: GenerateOpts) {
  const init = await useFetch<{ id: string; message?: string }>({
    method: 'post',
    url: opts.type === 'image' ? `${baseUrl}/generate/async` : `${baseUrl}/generate/text/async`,
    key: opts.key,
    payload: opts.payload,
  })

  if (init.statusCode && init.statusCode >= 400) {
    const error: any = new Error(
      `Failed to create Horde generation ${init.statusCode} ${
        init.body.message || init.statusMessage
      }`
    )
    error.body = init.body
    throw error
  }

  const url =
    opts.type === 'text'
      ? `${baseUrl}/generate/text/status/${init.body.id}`
      : `${baseUrl}/generate/status/${init.body.id}`

  const result = await poll(url, opts.key, opts.type === 'text' ? 2.5 : 6.5, opts.onTick)

  if (!result.generations || !result.generations.length) {
    const error: any = new Error(`Horde request failed: No generation received`)
    error.body = result
    throw error
  }

  const text = opts.type === 'text' ? result.generations[0].text : result.generations[0].img
  return { text, result }
}

async function poll(
  url: string,
  key: string | undefined,
  interval: number,
  onTick?: (status: HordeCheck) => void
) {
  const started = Date.now()
  const threshold = TIMEOUT_SECS * 1000

  do {
    const elapsed = Date.now() - started
    if (elapsed > threshold) {
      throw new Error(`Timed out (${TIMEOUT_SECS}s)`)
    }

    const res = await useFetch<HordeCheck>({ method: 'get', url, key })
    if (res.statusCode && res.statusCode >= 400) {
      const error: any = new Error(
        `Horde request failed (${res.statusCode}) ${res.body.message || res.statusMessage}`
      )
      error.body = res.body
      throw error
    }

    if (!res.body.generations?.length) {
      onTick?.(res.body)
    }

    if (res.body.faulted) {
      throw new Error(`Horde request failed: The worker faulted while generating.`)
    }

    if (res.body.done) {
      return res.body
    }

    await wait(interval)
  } while (true)
}

function wait(secs: number) {
  return new Promise((resolve) => setTimeout(resolve, secs * 1000))
}

function decryptText(text: string) {
  try {
    const decipher = crypto.createDecipher(ALGO, HORDE_SEED)
    const decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8')
    return decrypted
  } catch (ex) {
    return text
  }
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
