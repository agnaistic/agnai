import type { OutgoingHttpHeaders } from 'http'
import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { BOT_REPLACE, SELF_REPLACE } from '../../common/prompt'
import { OPENAI_MODELS } from '../../common/adapters'
import { StatusError } from '../api/wrap'
import { AppSchema } from '../db/schema'
import { getEncoder } from '../tokenize'
import { DEFAULT_SUMMARY_PROMPT } from '/common/image'
import { needleToSSE } from './stream'

const baseUrl = `https://api.openai.com`

type OpenAIMessagePropType = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const CHAT_MODELS: Record<string, boolean> = {
  [OPENAI_MODELS.Turbo]: true,
  [OPENAI_MODELS.Turbo0301]: true,
  [OPENAI_MODELS.GPT4]: true,
  [OPENAI_MODELS.GPT4_0314]: true,
  [OPENAI_MODELS.GPT4_32k]: true,
  [OPENAI_MODELS.GPT4_32k_0314]: true,
}

export const handleOAI: ModelAdapter = async function* (opts) {
  const {
    char,
    members,
    user,
    prompt,
    settings,
    sender,
    log,
    guest,
    lines,
    parts,
    gen,
    kind,
    isThirdParty,
  } = opts
  const base = getBaseUrl(user, isThirdParty)
  if (!user.oaiKey && !base.changed) {
    yield { error: `OpenAI request failed: No OpenAI API key not set. Check your settings.` }
    return
  }
  const oaiModel = settings.oaiModel ?? defaultPresets.openai.oaiModel

  const body: any = {
    model: oaiModel,
    stream: true, // TODO: Get from preset settings
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: gen.maxTokens ?? defaultPresets.openai.maxTokens,
    presence_penalty: gen.presencePenalty ?? defaultPresets.openai.presencePenalty,
    frequency_penalty: gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty,
    top_p: gen.topP ?? 1,
  }

  const useChat = !!CHAT_MODELS[oaiModel]

  if (useChat) {
    const encoder = getEncoder('openai', OPENAI_MODELS.Turbo)
    const handle = sender.handle || 'You'

    const messages: OpenAIMessagePropType[] = [{ role: 'system', content: parts.gaslight }]
    const history: OpenAIMessagePropType[] = []

    const all = []

    let maxBudget =
      (gen.maxContextLength || defaultPresets.openai.maxContextLength) - body.max_tokens

    let tokens = encoder(parts.gaslight)

    if (lines) {
      all.push(...lines)
    }

    if (parts.ujb) {
      history.push({ role: 'system', content: parts.ujb })
      tokens += encoder(parts.ujb)
    }

    if (kind === 'summary') {
      // This probably needs to be workshopped
      let content = user.images?.summaryPrompt || DEFAULT_SUMMARY_PROMPT

      if (!content.startsWith('(')) content = '(' + content
      if (!content.endsWith(')')) content = content + ')'

      tokens += encoder(content)
      history.push({ role: 'user', content })
    }

    if (kind === 'continue') {
      const content = '(Continue)'
      tokens += encoder(content)
      history.push({ role: 'user', content })
    }

    if (kind === 'self') {
      const content = `(Respond as ${handle})`
      tokens += encoder(content)
      history.push({ role: 'user', content })
    }

    for (const line of all.reverse()) {
      let role: 'user' | 'assistant' | 'system' = 'assistant'
      const isBot = line.startsWith(char.name)
      const content = line.trim().replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, handle)

      if (isBot) {
        role = 'assistant'
      } else if (line === '<START>') {
        role = 'system'
      } else {
        role = 'user'
      }
      const length = encoder(content)
      if (tokens + length > maxBudget) break

      tokens += length
      history.push({ role, content })
    }

    body.messages = messages.concat(history.reverse())
  } else {
    body.prompt = prompt
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

  const url = useChat ? `${base.url}/chat/completions` : `${base.url}/completions`

  const generator = body.stream ? streamCompletion : requestFullCompletion
  let result: Awaited<ReturnType<ReturnType<typeof generator>['next']>>
  let responseBody: FullCompletion | null = null

  while ((result = await generator(url, headers, body).next())) {
    // Both the streaming and non-streaming generators return a full completion and yield errors.
    // Only the streaming generator yields tokens.
    if (result.done) {
      responseBody = result.value
      break
    }

    if (result.value.error) {
      yield result.value
      return
    }

    if ('token' in result.value) {
      yield result.value.token
    }
  }

  try {
    let text = ''
    if (!responseBody?.choices?.length) {
      log.error({ body: responseBody }, 'OpenAI request failed: Empty response')
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
      return
    }

    const completion = responseBody.choices[0]
    if ('text' in completion) {
      text = completion.text
    } else {
      text = completion.message.content
    }

    const parsed = sanitise(text.replace(prompt, ''))
    const trimmed = trimResponseV2(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    log.error({ err: ex }, 'OpenAI failed to parse')
    yield { error: `OpenAI request failed: ${ex.message}` }
    return
  }
}

function getBaseUrl(user: AppSchema.User, isThirdParty?: boolean) {
  if (isThirdParty && user.thirdPartyFormat === 'openai' && user.koboldUrl) {
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

export async function getOpenAIUsage(oaiKey: string, guest: boolean): Promise<OAIUsage> {
  const key = guest ? oaiKey : decryptText(oaiKey)
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }

  const date = new Date()
  date.setDate(1)
  const start_date = date.toISOString().slice(0, 10)

  date.setMonth(date.getMonth() + 1)
  const end_date = date.toISOString().slice(0, 10)

  const res = await needle(
    'get',
    `${baseUrl}/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`,
    { headers }
  )
  if (res.statusCode && res.statusCode >= 400) {
    throw new StatusError(
      `Failed to retrieve usage (${res.statusCode}): ${res.body?.message || res.statusMessage}`,
      400
    )
  }

  return res.body
}

type TextCompletionContent = { text: string }
type ChatCompletionContent = { message: { content: string; role: 'system' | 'assistant' | 'user' } }
type FullCompletion = {
  id: string
  created: number
  model: string
  object: string
  choices:
    | ({
        finish_reason: string
        index: number
      } & (TextCompletionContent | ChatCompletionContent))[]
}
type StreamedCompletion = {
  id: string
  created: number
  model: string
  object: string
  choices: {
    finish_reason: string
    index: number
    delta: Partial<TextCompletionContent | ChatCompletionContent>
  }[]
}
type CompletionGenerator = (
  url: string,
  headers: OutgoingHttpHeaders,
  body: any
) => AsyncGenerator<{ error: string } | { error?: undefined; token: string }, FullCompletion | null>

const requestFullCompletion: CompletionGenerator = async function* (url, body, headers) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return null
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield { error: `OpenAI request failed (${resp.statusCode}): ${msg}` }
    return null
  }
  return resp.body
}

/**
 * Yields individual tokens as OpenAI API sends them, and ultimately returns a full completion
 * object once the stream is finished.
 */
const streamCompletion: CompletionGenerator = async function* (url, body, headers) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers: {
      ...headers,
      Accept: 'text/event-stream, application/json',
    },
  })
  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }

  try {
    const events = needleToSSE(resp)
    for await (const event of events) {
      // According to OpenAI's docs their SSE stream will only contain `data` events.
      // The first event for chat completions only contains the message's `role`.
      // The final event is always `data: [DONE]`.

      if (event === 'data: [DONE]') {
        break
      }

      const parsed: StreamedCompletion = JSON.parse(event.slice('data: '.length))
      const { choices, ...completionMeta } = parsed
      const { delta, ...choiceMeta } = choices[0]

      meta = { ...completionMeta, ...choiceMeta }

      if ('message' in delta && delta.message?.content) {
        const token = delta.message.content
        tokens.push(token)
        yield { token }
      } else if ('text' in delta && delta.text) {
        const token = delta.text
        tokens.push(token)
        yield { token }
      }
    }
  } catch (err: any) {
    yield { error: `OpenAI streaming request failed: ${err.message}` }
    return null
  } finally {
    resp.destroy()
  }

  return {
    id: meta.id,
    created: meta.created,
    model: meta.model,
    object: meta.object,
    choices: [
      {
        finish_reason: meta.finish_reason,
        index: meta.index,
        text: tokens.join(''),
      },
    ],
  }
}
