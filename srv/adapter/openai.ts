import { getOaiCompatibleUrl, joinUrl, sanitiseAndTrim } from '/common/requests/util'
import { ChatRole, ModelAdapter } from './type'
import { defaultPresets } from '../../common/presets'
import { AppLog } from '../middleware'
import { requestFullCompletion, toChatCompletionPayload } from './chat-completion'
import { decryptText } from '../db/util'
import { getTokenCounter } from '../tokenize'
import {
  ensureMessagesAlternate,
  insertImageContent,
  stripImageContent,
} from './template-chat-payload'
import { OPENAI_CHAT_MODELS, OPENAI_MODELS } from '/common/presets/openai'
import { streamGenerator } from '/common/requests/stream'
import { toImageJinjaTemplate } from '/common/requests/payloads'
import { JsonField } from '/common/prompt'

type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>

export type Inference = { message: { content: string; role: ChatRole } }

export type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, log, gen, guest, kind, isThirdParty } = opts
  const base = getOaiCompatibleUrl(gen, isThirdParty)
  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'

  const oaiKey = gen.providerId ? gen.thirdPartyKey : user.oaiKey
  if (!oaiKey && !base.changed) {
    yield { error: `OpenAI request failed: No OpenAI API key not set. Check your settings.` }
    return
  }

  const oaiModel =
    opts.gen.service === 'openai'
      ? gen.oaiModel || defaultPresets.openai.oaiModel
      : gen.thirdPartyModel || ''

  const maxResponseLength = gen.maxTokens ?? defaultPresets.openai.maxTokens

  const body: any = {
    model: oaiModel,
    stream: (gen.streamResponse && kind !== 'summary') ?? defaultPresets.openai.streamResponse,
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: maxResponseLength,
    top_p: gen.topP ?? 1,
    stop: [`\n${handle}:`].concat(gen.stopSequences!),
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
    body.reasoning = {
      exclude: !!gen.reasoning.exclude,
    }

    if (gen.reasoning.effort === 'custom') {
      body.reasoning.max_tokens = gen.reasoning.maxTokens
    } else {
      body.reasoning.effort = gen.reasoning.effort || 'low'
    }
  }

  if (gen.jsonEnabled && opts.jsonSchema) {
    const responseField = `${opts.replyAs?.name || opts.char?.name}'s response`
    const base = {
      [responseField]: { type: 'string' },
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
        type: 'object',
        strict: true,
        // name: 'response',
        schema: {
          strict: true,
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
    gen.thirdPartyFormat === 'openai-chat' || gen.thirdPartyFormat == 'openai-chatv2'
  const useChat = (isThirdParty && isChatFormat) || !!OPENAI_CHAT_MODELS[oaiModel]

  if (useChat) {
    const messages =
      gen.thirdPartyFormat === 'openai-chatv2' && opts.messages
        ? opts.messages
        : await toChatCompletionPayload(
            opts,
            getTokenCounter('openai', OPENAI_MODELS.Turbo),
            body.max_tokens
          )

    body.messages = messages

    yield { prompt: stripImageContent(messages) }

    // If we have image data, add it to the last user message
    insertImageContent(opts, body.messages)
  } else {
    body.prompt = prompt
    yield { prompt }
  }

  const useThirdPartyPassword = !!(base.changed && isThirdParty && gen.thirdPartyKey)

  let apiKey = useThirdPartyPassword ? gen.thirdPartyKey : !isThirdParty ? oaiKey : null

  if (!guest && apiKey) {
    apiKey = decryptText(apiKey)
  }
  const bearer = !!apiKey ? `Bearer ${apiKey}` : null

  const headers: any = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://agnai.chat',
    'X-Title': 'Agnai.Chat',
    'anthropic-version': '2023-06-01',
  }

  if (apiKey) {
    headers.Authorization = bearer
    headers['X-RapidAPI-Key'] = apiKey
    headers['x-api-key'] = apiKey
  }

  if (body.messages) {
    log.debug(
      { ...body, messages: stripImageContent(body.messages), prompt: undefined },
      'OpenAI payload'
    )
  } else {
    log.debug(body, 'OpenAI payload')
  }

  const url =
    !gen.providerId && !!gen.thirdPartyUrlNoSuffix
      ? base.url
      : useChat
      ? joinUrl(base.url, 'chat/completions')
      : joinUrl(base.url, 'completions')

  if (opts.conn.provider?.provider === 'known-mistral' && body.messages) {
    const merged = ensureMessagesAlternate(body.messages, { userFirst: true, userLast: true })
    body.messages = merged
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
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
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
      ? yield sanitiseAndTrim(accumulated, prompt, char, opts.characters, members)
      : yield sanitiseAndTrim(text, prompt, opts.replyAs, opts.characters, members)
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

  if ('text' in completion?.choices?.[0]) {
    return completion.choices[0].text
  } else {
    return completion?.choices?.[0]?.message?.content || ''
  }
}
