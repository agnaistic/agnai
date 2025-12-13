import { getOaiCompatibleUrl, joinUrl, sanitiseAndTrim } from '/common/requests/util'
import { AdapterProps, ChatRole, CompletionItem, ModelAdapter } from './type'
import { defaultPresets } from '../../common/presets'
import { AppLog } from '../middleware'
import {
  modelNeedsUserRoleLast,
  requestFullCompletion,
  toChatCompletionPayload,
} from './chat-completion'
import { decryptText } from '../db/util'
import { getTokenCounter } from '../tokenize'
import { ensureMessagesAlternate, stripImageContent } from '/common/template-messages'
import { OPENAI_MODELS } from '/common/presets/openai'
import { streamGenerator } from '/common/requests/stream'
import { getStoppingStrings, toImageJinjaTemplate } from '/common/requests/payloads'
import { JsonField } from '/common/prompt'
import { adjustMessageFormatting } from './util'

type CompletionContent<T = {}> = Array<
  {
    finish_reason: string
    index: number
    text?: string
    message?: { content: string; role: ChatRole }
  } & ({ text: string } | T)
>

export type Inference = { message: { content: string; role: ChatRole } }

export type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

const REASONING_MODELS: Record<string, boolean> = {
  'gpt-5': true,
  'gpt-5-2025-08-07': true,
  'gpt-5-mini': true,
  'gpt-5-mini-2025-08-07': true,
  'gpt-5-nano': true,
  'gpt-5-nano-2025-08-07': true,
  'gpt-5.1-chat-latest': true,
  o1: true,
  'o1-2024-12-17': true,
  o3: true,
  'o3-2025-04-16': true,
  'o3-mini': true,
  'o3-mini-2025-01-31': true,
  'o4-mini': true,
  'o4-mini-2025-04-16': true,
  'o4-mini-deep-research': true,
  'o4-mini-deep-research-2025-06-26': true,
}

export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, log, gen, guest, kind, isThirdParty } = opts
  const base = getOaiCompatibleUrl(gen, isThirdParty)

  let oaiKey = gen.providerId ? gen.thirdPartyKey : gen.thirdPartyKey || user.oaiKey

  if (!guest && oaiKey) {
    oaiKey = decryptText(oaiKey)
  }

  const oaiModel = gen.thirdPartyModel || ''
  const maxResponseLength = gen.maxTokens ?? defaultPresets.openai.maxTokens

  const stops = getStoppingStrings(opts, opts.gen)
  const allStops = stops.slice()

  if (!base.changed) {
    stops.splice(4, stops.length - 4)
  }

  const body: any = {
    model: oaiModel,
    stream: (gen.streamResponse && kind !== 'summary') ?? defaultPresets.openai.streamResponse,
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: maxResponseLength,
    // max_completion_tokens: maxResponseLength,
    // max_response_tokens: maxResponseLength,
    top_p: gen.topP ?? 1,
    stop: stops,
  }

  if (REASONING_MODELS[oaiModel] || opts.conn.provider?.subFormat === 'reasoning') {
    body.max_completion_tokens = maxResponseLength
    delete body.max_tokens
    delete body.stop
    body.temperature = 1
  }

  // if (gen.service !== 'openai') {
  //   body.min_p = gen.minP
  //   body.top_k = gen.topK! < 1 ? undefined : gen.topK
  //   body.top_a = gen.topA
  //   body.repetition_penalty = gen.repetitionPenalty
  //   body.presence_penalty = gen.presencePenalty ?? defaultPresets.openai.presencePenalty
  //   body.frequency_penalty = gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty
  // }

  if (gen.reasoning?.enabled) {
    if (opts.conn.provider?.provider === 'known-zai') {
      body.thinking = { type: 'enabled' }
    } else {
      body.reasoning = {
        exclude: !!gen.reasoning.exclude,
      }

      if (gen.reasoning.effort === 'custom') {
        body.reasoning.max_tokens = gen.reasoning.maxTokens
      } else {
        body.reasoning.effort = gen.reasoning.effort || 'low'
      }
    }
  }

  if (opts.jsonSchema) {
    const base: any = {}

    const responseName = opts.replyAs?.name || opts.char?.name
    if (responseName) {
      const field = `${responseName}'s response`
      base[field] = { type: 'string' }
    }

    const fields = opts.jsonSchema.reduce((prev: any, field: JsonField) => {
      const { disabled, name, type, ...rest } = field
      prev[field.name] = {
        type: type.type,
        ...rest,
      }
      return prev
    }, base as any)

    // OpenAI format
    // https://platform.openai.com/docs/guides/structured-outputs
    const required = Object.keys(fields)
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        // type: 'object',
        // strict: true,
        schema: {
          strict: true,
          type: 'object',
          properties: fields,
          required,
          additionalProperties: false,
        },
      },
    }
  }

  if (isThirdParty && gen.jinjaEnabled) {
    body.chat_template = toImageJinjaTemplate({ format: gen.modelFormat, jinja: gen.jinjaTemplate })
  }

  const isChatFormat =
    gen.thirdPartyFormat === 'openai-chat' ||
    gen.thirdPartyFormat == 'openai-chatv2' ||
    gen.thirdPartyFormat === 'lm-studio'
  const useChat = (isThirdParty && isChatFormat) || gen.service === 'openai'

  if (useChat) {
    const messages =
      gen.thirdPartyFormat !== 'openai-chat' && opts.messages
        ? opts.messages
        : await toChatCompletionPayload(
            opts,
            getTokenCounter('openai', OPENAI_MODELS.Turbo),
            body.max_tokens
          )

    body.messages = messages

    /**
     * @todo provide an option for this
     * there are some provider/model combinations that need to be 'patched' before dispatching
     */
    patchPayload(opts, body, messages)

    yield { prompt: stripImageContent(messages) }
  } else {
    body.prompt = prompt
    yield { prompt }
  }

  const bearer = !!oaiKey ? `Bearer ${oaiKey}` : null

  const headers: any = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://agnai.chat',
    'X-Title': 'Agnai.Chat',
    'anthropic-version': '2023-06-01',
  }

  if (oaiKey) {
    headers.Authorization = bearer
    headers['X-RapidAPI-Key'] = oaiKey
    headers['x-api-key'] = oaiKey
  }

  if (body.messages) {
    log.debug({ ...body, messages: undefined, prompt: undefined }, 'OpenAI payload')
  } else {
    log.debug(body, 'OpenAI payload')
  }

  const url =
    (!gen.providerId && !!gen.thirdPartyUrlNoSuffix) ||
    base.url.includes('/completion') ||
    opts.conn.provider?.disableAutoUrl
      ? base.url
      : useChat
      ? joinUrl(base.url, 'chat/completions')
      : joinUrl(base.url, 'completions')

  if (opts.conn.provider?.provider === 'known-mistral' && body.messages) {
    const merged = ensureMessagesAlternate(body.messages, { userFirst: true, userLast: true })
    body.messages = merged
  }

  if (body.messages) {
    body.messages = adjustMessageFormatting(opts.conn, body.messages)
  }

  const iter = body.stream
    ? streamGenerator({
        userId: opts.user._id,
        url,
        headers,
        body,
        service: 'OpenAI',
        log: opts.log,
        signal: opts.signal,
      })
    : requestFullCompletion({
        userId: opts.user._id,
        url,
        headers,
        body,
        service: 'OpenAI',
        log: opts.log,
        signal: opts.signal,
      })

  let accumulated = ''
  let response: Completion<Inference> | undefined

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if ('error' in generated.value) {
      if (typeof generated.value.error === 'object') {
        const msg = JSON.stringify(generated.value.error)
        yield { error: msg }
        return
      }
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield {
        partial: sanitiseAndTrim({
          text: accumulated,
          char,
          members,
          gen: opts.gen,
          stops: allStops,
        }),
      }
    }

    if ('meta' in generated.value) {
      yield { meta: generated.value.meta }
    }

    if ('tokens' in generated.value && typeof generated.value.tokens === 'string') {
      accumulated = generated.value.tokens
    }
  }

  try {
    let text = accumulated ? accumulated : getCompletionContent(response, log)
    if (text instanceof Error) {
      yield { error: `[Chat] Request returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      log.error({ body: response }, '[Chat] Request failed: Empty response')
      yield { error: `[Chat] Request failed: Received empty response. Try again.` }
      return
    }

    gen.swipesPerGeneration! > 1
      ? yield sanitiseAndTrim({
          text: accumulated,
          char,
          members,
          gen: opts.gen,
          stops: allStops,
        })
      : yield sanitiseAndTrim({
          text,
          char: opts.replyAs,
          members,
          gen: opts.gen,
          stops: allStops,
        })
  } catch (ex: any) {
    log.error({ err: ex }, 'OpenAI failed to parse')
    yield { error: `OpenAI request failed: ${ex.message}` }
    return
  }
}

export type OAIUsage = {
  daily_costs: Array<{ timestamp: number; line_item: Array<{ name: string; cost: number }> }>
  object: string
  total_usage: number
}

export function getCompletionContent(completion: Completion<Inference> | undefined, log: AppLog) {
  if (!completion) {
    return ''
  }

  if (completion.error?.message) {
    log.warn({ completion }, 'OpenAI returned an error')
    return new Error(completion.error.message)
  }

  if (typeof completion === 'string') {
    return completion
  }

  const choice = completion?.choices?.[0]
  if (choice && 'text' in choice) {
    return choice.text
  } else {
    return choice?.message?.content || ''
  }
}

function patchPayload(opts: AdapterProps, body: any, messages: CompletionItem<string>[]) {
  const { conn } = opts
  if (!conn.provider) return

  const model: string = (body.model || '').toLowerCase()
  const lastMsg = messages[messages.length - 1]

  switch (conn.provider.provider) {
    case 'known-deepseek': {
      if (!lastMsg) return
      lastMsg.role = 'user'
      return
    }

    case 'known-openrouter': {
      if (!modelNeedsUserRoleLast(opts.gen, body.model)) return
      if (!lastMsg) return
      lastMsg.role = 'user'
      return
    }
  }

  if (modelNeedsUserRoleLast(opts.gen, model)) {
    lastMsg.role = 'user'
  }
}
