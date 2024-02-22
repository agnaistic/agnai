import needle from 'needle'
import { sanitiseAndTrim } from '../api/chat/common'
import { ModelAdapter } from './type'
import { defaultPresets } from '../../common/presets'
import { OPENAI_CHAT_MODELS } from '../../common/adapters'
import { AppSchema } from '../../common/types/schema'
import { config } from '../config'
import { AppLog } from '../logger'
import { streamCompletion, toChatCompletionPayload } from './chat-completion'
import { decryptText } from '../db/util'

const baseUrl = `https://api.openai.com`

type Role = 'user' | 'assistant' | 'system'

type CompletionItem = { role: Role; content: string; name?: string }
type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>
type Inference = { message: { content: string; role: Role } }

type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

type CompletionGenerator = (
  userId: string,
  url: string,
  headers: Record<string, string | string[] | number>,
  body: any,
  log: AppLog
) => AsyncGenerator<
  { error: string } | { error?: undefined; token: string },
  Completion | undefined
>

export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, log, gen, guest, kind, isThirdParty } = opts
  const base = getBaseUrl(user, !!gen.thirdPartyUrlNoSuffix, isThirdParty)
  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  if (!user.oaiKey && !base.changed) {
    yield { error: `OpenAI request failed: No OpenAI API key not set. Check your settings.` }
    return
  }

  const oaiModel =
    gen.thirdPartyModel || gen.mistralModel || gen.oaiModel || defaultPresets.openai.oaiModel

  const maxResponseLength = gen.maxTokens ?? defaultPresets.openai.maxTokens

  const body: any = {
    model: oaiModel,
    stream: (gen.streamResponse && kind !== 'summary') ?? defaultPresets.openai.streamResponse,
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: maxResponseLength,
    top_p: gen.topP ?? 1,
    stop: [`\n${handle}:`].concat(gen.stopSequences!),
  }

  const useMistral: boolean = isThirdParty === true && gen.thirdPartyFormat === 'mistral'
  if (!useMistral) {
    body.presence_penalty = gen.presencePenalty ?? defaultPresets.openai.presencePenalty
    body.frequency_penalty = gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty
  }

  const useTabby = isThirdParty && gen.thirdPartyFormat === 'tabby'

  if (useTabby) {
    body.top_k = gen.topK
    body.top_a = gen.topA
    body.min_p = gen.minP
    body.smoothing_factor = gen.smoothingFactor
    body.tfs = gen.tailFreeSampling
    body.typical = gen.typicalP
    body.repetition_penalty = gen.repetitionPenalty
    body.repetition_penalty_range = gen.repetitionPenaltyRange
    body.mirostat_mode = gen.mirostatToggle ? 2 : 0
    body.mirostat_tau = gen.mirostatTau
    body.mirostat_eta = gen.mirostatLR
    body.add_bos_token = gen.addBosToken
    body.ban_eos_token = gen.banEosToken
    body.cfg_scale = gen.cfgScale
    body.negative_prompt = gen.cfgOppose
    if (gen.dynatemp_range) {
      body.min_temp = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.max_temp = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.temp_exponent = gen.dynatemp_exponent
    }
  }

  const useChat =
    useMistral ||
    (isThirdParty && gen.thirdPartyFormat === 'openai-chat') ||
    !!OPENAI_CHAT_MODELS[oaiModel]

  if (useChat) {
    const messages: CompletionItem[] = config.inference.flatChatCompletion
      ? [{ role: 'system', content: opts.prompt }]
      : await toChatCompletionPayload(opts, body.max_tokens, useMistral)

    body.messages = messages
    yield { prompt: messages }
  } else {
    body.prompt = prompt
    yield { prompt }
  }

  if (gen.antiBond) body.logit_bias = { 3938: -50, 11049: -50, 64186: -50, 3717: -25 }

  const useThirdPartyPassword = base.changed && isThirdParty && user.thirdPartyPassword
  const apiKey = useThirdPartyPassword
    ? user.thirdPartyPassword
    : !isThirdParty
    ? user.oaiKey
    : null
  const bearer = !!guest ? `Bearer ${apiKey}` : apiKey ? `Bearer ${decryptText(apiKey)}` : null

  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (bearer) {
    headers.Authorization = bearer
  }

  log.debug(body, 'OpenAI payload')

  const url = gen.thirdPartyUrlNoSuffix
    ? base.url
    : useChat
    ? `${base.url}/chat/completions`
    : `${base.url}/completions`

  const iter = body.stream
    ? streamCompletion(opts.user._id, url, headers, body, 'OpenAI', opts.log)
    : requestFullCompletion(opts.user._id, url, headers, body, opts.log)
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

const requestFullCompletion: CompletionGenerator = async function* (
  _userId,
  url,
  headers,
  body,
  _log
) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield { error: `OpenAI request failed (${resp.statusCode}): ${msg}` }
    return
  }

  return resp.body
}

function getCompletionContent(completion: Completion<Inference> | undefined, log: AppLog) {
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
