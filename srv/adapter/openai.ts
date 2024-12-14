import { sanitiseAndTrim } from '/common/requests/util'
import { ChatRole, ModelAdapter } from './type'
import { defaultPresets } from '../../common/presets'
import { OPENAI_CHAT_MODELS, OPENAI_MODELS } from '../../common/adapters'
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'
import { requestFullCompletion, toChatCompletionPayload } from './chat-completion'
import { decryptText } from '../db/util'
import { streamCompletion } from './stream'
import { getTokenCounter } from '../tokenize'

const baseUrl = `https://api.openai.com`

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
  const base = getBaseUrl(user, !!gen.thirdPartyUrlNoSuffix, isThirdParty)
  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  if (!user.oaiKey && !base.changed) {
    yield { error: `OpenAI request failed: No OpenAI API key not set. Check your settings.` }
    return
  }

  const oaiModel = gen.thirdPartyModel || gen.oaiModel || defaultPresets.openai.oaiModel
  const maxResponseLength = gen.maxTokens ?? defaultPresets.openai.maxTokens

  const body: any = {
    model: oaiModel,
    stream: (gen.streamResponse && kind !== 'summary') ?? defaultPresets.openai.streamResponse,
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: maxResponseLength,
    top_p: gen.topP ?? 1,
    stop: [`\n${handle}:`].concat(gen.stopSequences!),
  }

  body.presence_penalty = gen.presencePenalty ?? defaultPresets.openai.presencePenalty
  body.frequency_penalty = gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty

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
    yield { prompt: messages }
  } else {
    body.prompt = prompt
    yield { prompt }
  }

  if (gen.antiBond) body.logit_bias = { 3938: -50, 11049: -50, 64186: -50, 3717: -25 }

  const useThirdPartyPassword =
    base.changed && isThirdParty && (gen.thirdPartyKey || user.thirdPartyPassword)

  let apiKey = useThirdPartyPassword
    ? gen.thirdPartyKey || user.thirdPartyPassword
    : !isThirdParty
    ? user.oaiKey
    : null

  if (!guest && apiKey) {
    apiKey = decryptText(apiKey)
  }
  const bearer = !!apiKey ? `Bearer ${apiKey}` : null

  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = bearer
    headers['X-RapidAPI-Key'] = apiKey
  }

  log.debug(body, 'OpenAI payload')

  const url = gen.thirdPartyUrlNoSuffix
    ? base.url
    : useChat
    ? `${base.url}/chat/completions`
    : `${base.url}/completions`

  const iter = body.stream
    ? streamCompletion(opts.user._id, url, headers, body, 'OpenAI', opts.log)
    : requestFullCompletion(opts.user._id, url, headers, body, 'OpenAI', opts.log)
  let accumulated = ''
  let response: Completion<Inference> | undefined

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if (generated.value.error) {
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
    }
  }

  try {
    let text = getCompletionContent(response, log)
    if (text instanceof Error) {
      yield { error: `OpenAI returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      log.error({ body: response }, 'OpenAI request failed: Empty response')
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
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

function getBaseUrl(user: AppSchema.User, noSuffix: boolean, isThirdParty?: boolean) {
  if (isThirdParty && user.koboldUrl) {
    if (noSuffix) return { url: user.koboldUrl, changed: true }

    // If the user provides a versioned API URL for their third-party API, use that. Otherwise
    // fall back to the standard /v1 URL.
    const version = user.koboldUrl.match(/\/v\d+$/) ? '' : '/v1'
    return { url: user.koboldUrl + version, changed: true }
  }

  return { url: `${baseUrl}/v1`, changed: false }
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

  if ('text' in completion.choices[0]) {
    return completion.choices[0].text
  } else {
    return completion.choices[0].message.content
  }
}
