import needle from 'needle'
import { decryptText } from '../db/util'
import { registerAdapter } from './register'
import { ModelAdapter } from './type'
import { sanitiseAndTrim } from '/common/requests/util'
import { AppLog } from '../middleware'
import { OpenRouterModel } from '/common/adapters'
import { createClaudeChatCompletion } from './claude'
import { logPayload, stripImageContent } from './template-chat-payload'
import { streamGenerator } from '/common/requests/stream'
import { getJsonSchemaPayload } from '/common/guidance/json-schema'
import { getStoppingStrings } from '/common/requests/payloads'
import { modelNeedsUserRoleLast } from './chat-completion'

const baseUrl = 'https://openrouter.ai/api/v1'
const chatUrl = `${baseUrl}/chat/completions`
const completionUrl = `${baseUrl}/completions`

let modelCache: OpenRouterModel[]

export const handleOpenRouter: ModelAdapter = async function* (opts) {
  const { user, guest } = opts

  const key = opts.gen.providerId
    ? opts.gen.thirdPartyKey
    : opts.gen.thirdPartyKey || user.adapterConfig?.openrouter?.apiKey

  if (!key) {
    yield {
      error:
        'OpenRouter request failed: Set your API key in the settings page. Visit openrouter.ai/keys to generate one.',
    }
    return
  }

  const stops = getStoppingStrings(opts, opts.gen)
  const payload: any = {
    stream: opts.gen.streamResponse,
    // 256 is the OpenRouter default. We will use this.
    temperature: opts.gen.temp,
    max_tokens: opts.gen.maxTokens ?? 256,
    stop: stops,
    top_p: opts.gen.topP,
    top_k: opts.gen.topK,
    top_a: opts.gen.topA,
    min_p: opts.gen.minP,

    frequency_penalty: opts.gen.frequencyPenalty,
    presence_penalty: opts.gen.presencePenalty,
    repetition_penalty: opts.gen.repetitionPenalty,
  }

  if (opts.gen.reasoning?.enabled) {
    payload.reasoning = {
      exclude: opts.gen.reasoning.exclude ?? false,
    }

    if (opts.gen.reasoning.effort === 'custom') {
      payload.reasoning.max_tokens = opts.gen.reasoning.maxTokens ?? 0
    } else {
      payload.reasoning.effort = opts.gen.reasoning.effort ?? 'low'
    }
  }

  if (opts.gen.openRouterModel?.id) {
    payload.model = opts.gen.openRouterModel.id
  } else {
    payload.model = opts.gen.thirdPartyModel
  }

  if (opts.gen.jsonEnabled && opts.jsonSchema) {
    payload.response_format = getJsonSchemaPayload(opts.jsonSchema, 'openai', opts)
  }

  const useAnthropic =
    opts.gen.service !== 'openrouter-completion' &&
    (opts.gen.openRouterModel?.id || '').startsWith('anthropic')

  if (opts.gen.service === 'openrouter-completion') {
    payload.prompt = opts.prompt
  } else if (useAnthropic) {
    const { messages, system } = await createClaudeChatCompletion(opts)
    payload.messages = messages
    payload.system = system
  } else if (opts.messages) {
    const last = opts.messages.slice(-1)[0]
    if (last && modelNeedsUserRoleLast(opts.gen, payload.model)) {
      last.role = 'user'
    }
    payload.messages = opts.messages
  } else {
    payload.prompt = opts.prompt
  }

  yield {
    prompt: payload.messages
      ? JSON.stringify(stripImageContent(payload.messages), null, 2)
      : payload.prompt,
  }

  const headers = {
    Authorization: `Bearer ${guest ? key : decryptText(key)}`,
    'HTTP-Referer': 'https://agnai.chat',
  }

  const res = opts.gen.streamResponse
    ? streamGenerator({
        userId: user._id,
        url: payload.prompt ? completionUrl : chatUrl,
        headers,
        body: payload,
        service: 'OpenRouter',
        log: opts.log,
        format: 'openrouter',
        signal: opts.signal,
      })
    : getCompletion(opts.signal, payload, headers)

  let accum = ''
  let fullText: string | undefined
  let response: any

  logPayload(opts.log, payload)

  while (true) {
    const gen = await res.next()
    if (gen.done) {
      response = gen.value
      break
    }

    if ('error' in gen.value) {
      yield gen.value
      return
    }

    if ('meta' in gen.value) {
      yield { meta: gen.value.meta }
    }

    if ('token' in gen.value) {
      accum += gen.value.token
      yield {
        partial: sanitiseAndTrim({
          text: accum,
          char: opts.replyAs,
          members: opts.members,
          gen: opts.gen,
        }),
      }
    }

    if (typeof gen.value === 'string') {
      fullText = gen.value
    }
  }

  if (response && 'model' in response) {
    yield { meta: { model: response.model, provider: response.provider, ...response.usage } }
  }

  const text = fullText === undefined ? getResponseText(response, opts.log) : fullText
  if (text instanceof Error) {
    yield { error: `OpenRouter response failed: ${text.message}` }
    return
  }

  if (!text?.length) {
    opts.log.error({ body: response }, 'OpenRouter request failed: Empty response')
    yield { error: `OpenRouter request failed: Received empty response. Try again.` }
    return
  }

  const trimmed = sanitiseAndTrim({
    text,
    char: opts.replyAs,
    members: opts.members,
    gen: opts.gen,
    stops,
  })
  yield trimmed
}

async function* getCompletion(
  signal: AbortController,
  payload: any,
  headers: any
): AsyncGenerator<any> {
  const resp = await needle('post', chatUrl, JSON.stringify(payload), {
    signal: signal.signal,
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))

  if ('err' in resp) {
    yield { error: `OpenRouter request failed: ${resp.err.message || resp.err}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body.message || resp.body.error?.message || resp.statusMessage || 'Unknown error'
    yield { error: `OpenRouter request failed (${resp.statusCode}): ${msg}` }
    return
  }

  return resp.body
}

registerAdapter('openrouter', handleOpenRouter, {
  label: 'OpenRouter',
  settings: [
    {
      field: 'apiKey',
      label: 'API Key',
      helperText:
        'If you are unable to use the "Login with OpenRouter" button, enter your API key manually. Head to openrouter.ai/keys to obtain an API key.',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. sk-or-v1-2v6few...' },
    },
  ],
  options: ['temp', 'maxTokens'],
})

function getResponseText(resp: any, log: AppLog) {
  if (typeof resp === 'string') {
    resp = JSON.parse(resp)
  }

  if (resp.type === 'Buffer') {
    const buffer = Buffer.from(resp.data).toString()
    return getResponseText(buffer, log)
  }

  log.debug({ resp }, 'Get response text')

  if (!resp.choices || !Array.isArray(resp.choices) || resp.choices.length === 0) {
    log.warn({ resp }, 'OpenRouter response was empty (No choices)')
    return new Error(`Response contained no data (No choices)`)
  }

  const choice = resp.choices[0]
  if (choice.text) return choice.text as string

  const message = choice.message
  if (typeof message === 'string') return message

  if (!message || !message.content) {
    log.warn({ resp }, 'OpenRouter response was empty (No text)')
    return new Error(`Response contained no data (No text)`)
  }

  return message.content as string
}

export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (modelCache) return modelCache

  return fetchOpenRouterModels()
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await needle('get', 'https://openrouter.ai/api/v1/models', {}, { json: true })
    if (res.body) {
      const models = Array.isArray(res.body.data) ? res.body.data : []

      modelCache = models.map((m: OpenRouterModel) => ({
        id: m.id,
        context_length: m.context_length,
        pricing: { prompt: m.pricing?.prompt || 0, completion: m.pricing?.completion || 0 },
      }))
    }

    return modelCache
  } catch (ex) {
    return modelCache || []
  }
}

setInterval(fetchOpenRouterModels, 60000 * 2)
fetchOpenRouterModels()
