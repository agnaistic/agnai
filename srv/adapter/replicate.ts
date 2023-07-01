import needle from 'needle'
import { decryptText } from '../db/util'
import { registerAdapter } from './register'
import { ModelAdapter } from './type'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { tokenize } from '/common/tokenize'
import { sendMany } from '../api/ws'
import { logger } from '../logger'

const publicApiV1 = 'https://api.replicate.com/v1'

const COLLECTIONS = {
  language: 'language-models',
  image: 'text-to-image',
  diffusion: 'diffusion-models',
  imageEditing: 'image-editing',
  embedding: 'embedding-models',
  audio: 'audio-generation',
  video: 'text-to-video',
  upscale: 'super-resolution',
  makeover: 'ml-makeovers',
  controlNet: 'control-net',
}

// Llama: https://replicate.com/replicate/vicuna-13b/api
type ReplicateInputLlama = {
  prompt: string
  max_length?: number
  temperature?: number
  top_p?: number
  repetition_penalty?: number
  seed?: number
  debug?: boolean
}

type ReplicateOutputLlama = string[]

// StableLM: https://replicate.com/stability-ai/stablelm-tuned-alpha-7b/api
type ReplicateInputStableLm = {
  prompt: string
  max_tokens?: number
  temperature?: number
  top_p?: number
  repetition_penalty?: number
}

type ReplicateOutputStableLm = string[]

// OpenAssistant: https://replicate.com/replicate/oasst-sft-1-pythia-12b/api
type ReplicateInputOpenAssistant = {
  prompt: string
  max_length?: number
  decoding?: 'top_p' | 'top_k'
  temperature?: number
  top_p?: number
  top_k?: number
  repetition_penalty?: number
}

type ReplicateOutputOpenAssistant = string[]

// Replica: https://replicate.com/docs/reference/http

type ReplicatePredictionRequest = {
  version: string
  input: ReplicateInputLlama | ReplicateInputStableLm | ReplicateInputOpenAssistant
}

type ReplicatePredictionResponse = {
  id: string
  version: string
  urls: {
    get: string
    cancel: string
  }
  created_at: string | null
  started_at: string | null
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  input: { text: string }
  output: ReplicateOutputLlama | ReplicateOutputStableLm | ReplicateOutputOpenAssistant | null
  error: string | null
  logs: string
  metrics: { predict_time: number }
}

export const handleReplicate: ModelAdapter = async function* (opts) {
  const { log } = opts
  const config = opts.user.adapterConfig?.replicate
  if (!config) {
    yield {
      error: `Replicate request failed: User settings missing. Make sure you've provided your API key in your user settings.`,
    }
    return
  }

  const key = config.apiToken ? (opts.guest ? config.apiToken : decryptText(config.apiToken)) : null
  if (!key) {
    yield {
      error: `Replicate request failed: No API Token set. Make sure it is set in your user settings.`,
    }
    return
  }

  const modelType = opts.gen.replicateModelType || 'llama'

  const version =
    opts.gen.replicateModelVersion ||
    '6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b'

  let input: ReplicatePredictionRequest['input']
  switch (modelType) {
    case 'llama': {
      input = {
        prompt: opts.prompt,
        max_length: (await tokenize(opts.prompt)) + (opts.gen.maxTokens || 500),
        temperature: opts.gen.temp,
        top_p: opts.gen.topP,
        repetition_penalty: opts.gen.repetitionPenalty,
      }
      break
    }
    case 'stablelm': {
      // TODO: Use a similar logic to OpenAI
      const prompt = opts.prompt
        .replace(new RegExp(`^${opts.replyAs.name}:`, 'gm'), '\n<|ASSISTANT|>')
        .replace(new RegExp(`^${opts.members[0].handle || 'You'}:`, 'gm'), '\n<|USER|>')
      input = {
        prompt: prompt,
        max_tokens: (await tokenize(opts.prompt)) + (opts.gen.maxTokens || 500),
        temperature: opts.gen.temp,
        top_p: opts.gen.topP,
        repetition_penalty: opts.gen.repetitionPenalty,
      }
      break
    }
    case 'openassistant': {
      // TODO: Use a similar logic to OpenAI
      const prompt = opts.prompt
        .replace(new RegExp(`^${opts.replyAs.name}:`, 'gm'), '<|endoftext|><|assistant|>')
        .replace(
          new RegExp(`^${opts.members[0].handle || 'You'}:`, 'gm'),
          '<|endoftext|><|prompter|>'
        )
      input = {
        prompt: prompt,
        max_length: (await tokenize(opts.prompt)) + (opts.gen.maxTokens || 500),
        decoding: 'top_p',
        temperature: opts.gen.temp,
        top_p: opts.gen.topP,
        repetition_penalty: opts.gen.repetitionPenalty,
      }
      break
    }
    default:
      yield { error: `Replicate request failed: Unknown model type ${modelType}` }
      return
  }

  const body: ReplicatePredictionRequest = {
    version,
    input,
  }

  let prediction: ReplicatePredictionResponse
  try {
    prediction = await createPrediction(body, key)
  } catch (e: any) {
    log.error({ error: e.message }, 'Replicate failed to send')
    yield { error: `Replicate request failed: ${e.message}` }
    return
  }

  let secondsSinceStart = 0
  const timeoutInSeconds = 60 * 5 // Model cold boots can take 3 to 5 minutes
  const coldBootNotificationInSeconds = 20
  let hasDispatchedStartingMessage = false

  predictionWaitLoop: while (true) {
    try {
      prediction = await getPrediction(prediction.urls.get, key)
    } catch (e: any) {
      log.error({ error: e.message }, 'Failed to poll replicate')
      yield { error: `Replicate request failed: ${e.message}` }
      return
    }

    const status = prediction.status

    switch (status) {
      case 'succeeded':
        break predictionWaitLoop
      case 'starting':
      case 'processing':
        if (
          !hasDispatchedStartingMessage &&
          status === 'starting' &&
          secondsSinceStart > coldBootNotificationInSeconds
        ) {
          hasDispatchedStartingMessage = true
          // TODO: Dispatching to ws here is not ideal
          sendMany(opts.guest ? [opts.guest] : opts.members.map((m) => m.userId), {
            type: 'chat-server-notification',
            chatId: opts.chat._id,
            text: 'The Replicate model is starting up. This can take 3-5 minutes.',
          })
        }
        if (secondsSinceStart++ < timeoutInSeconds) {
          await sleep(1000)
          continue
        }
        yield { error: `Replicate request timed out (request id: ${prediction.id})` }
        return
      case 'failed':
      case 'canceled':
      default:
        throw new Error(
          `Replicate prediction request status: ${status} (error: ${prediction.error})`
        )
    }
  }

  try {
    const output: ReplicatePredictionResponse['output'] = prediction.output
    // The first token always seems to be missing a space.
    let text = output ? output[0] + ' ' + output.slice(1).join('') : ''
    if (!text) {
      log.error({ body: prediction }, 'Replicate request failed: Empty response')
      yield { error: `Replicate request failed: Received empty response.` }
      return
    }
    const parsed = sanitise(text)
    const trimmed = trimResponseV2(parsed, opts.replyAs, opts.members, opts.characters, [
      '<|USER|>',
      '<|ASSISTANT|>',
      '[/LIST]',
      '<|endoftext|>',
      '<|prompter|>',
      '<|assistant|>',
    ])
    yield trimmed || parsed
  } catch (ex: any) {
    log.error({ err: ex }, 'Replicate failed to parse')
    yield { error: `Replicate request failed: ${ex.message}` }
    return
  }
}

registerAdapter('replicate', handleReplicate, {
  label: 'Replicate',
  settings: [
    {
      field: 'apiToken',
      label: 'API Token',
      helperText: 'You can get your key from https://replicate.com/account/api-tokens',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. a0_Q45sfF...' },
    },
  ],
  options: ['temp', 'maxTokens', 'repetitionPenalty', 'topP'],
})

async function createPrediction(body: any, key: string): Promise<ReplicatePredictionResponse> {
  const url = `${publicApiV1}/predictions`
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers: { Authorization: `Token ${key}` },
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    throw new Error(resp.error?.message || resp.error)
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    if (resp.statusCode === 404) {
      throw new Error(`Request failed: Not Found (verify your model version)`)
    }

    throw new Error(`Request failed (${resp.statusCode}): ${JSON.stringify(resp.body)}`)
  }

  return resp.body
}

async function getPrediction(url: string, key: string): Promise<ReplicatePredictionResponse> {
  const resp = await needle('get', url, {
    headers: { Authorization: `Token ${key}` },
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    throw new Error(resp.error?.message || resp.error)
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    throw new Error(`Request failed (${resp.statusCode}): ${JSON.stringify(resp.body)}`)
  }

  return resp.body
}

function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export async function getCollections(key: string) {
  const resp = await needle(`get`, `${publicApiV1}/collections`, {
    headers: { Authorization: `Token ${parseKey(key)}` },
  })

  if (resp.statusCode && resp.statusCode >= 400) {
    logger.error({ body: resp.body }, `Failed to get replicate collections`)
    throw new Error(`[${resp.statusCode}] Failed to get collections`)
  }

  return resp.body
}

export async function getCollection(key: string, slug: string) {
  const resp = await needle(`get`, `${publicApiV1}/collections/${slug}`, {
    headers: { Authorization: `Token ${parseKey(key)}` },
  })

  if (resp.statusCode && resp.statusCode >= 400) {
    logger.error({ body: resp.body }, `Failed to get replicate collections`)
    throw new Error(`[${resp.statusCode}] Failed to get collections`)
  }

  return resp.body
}

export async function getLanguageCollection(key: string) {
  return getCollection(key, COLLECTIONS.language)
}

function parseKey(key: string) {
  try {
    return decryptText(key)
  } catch (ex) {
    return key
  }
}
