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

    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: gen.maxTokens ?? defaultPresets.openai.maxTokens,
    presence_penalty: gen.presencePenalty ?? defaultPresets.openai.presencePenalty,
    frequency_penalty: gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty,
    top_p: gen.topP ?? 1,
  }

  const useChat = !!CHAT_MODELS[oaiModel]

  if (useChat) {
    const encoder = getEncoder('openai', OPENAI_MODELS.Turbo)
    const user = sender.handle || 'You'

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

    if (kind === 'continue') {
      const content = '(Continue)'
      tokens += encoder(content)
      history.push({ role: 'user', content })
    }

    if (kind === 'self') {
      const content = `(Respond as ${user})`
      tokens += encoder(content)
      history.push({ role: 'user', content })
    }

    for (const line of all.reverse()) {
      let role: 'user' | 'assistant' | 'system' = 'assistant'
      const isBot = line.startsWith(char.name)
      const content = line.trim().replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, user)

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

  const url = useChat ? `${base.url}/v1/chat/completions` : `${base.url}/v1/completions`

  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    log.error({ error: resp.error }, 'OpenAI failed to send')
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ body: resp.body }, `OpenAI request failed (${resp.statusCode})`)
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield {
      error: `OpenAI request failed (${resp.statusCode}): ${msg}`,
    }
    return
  }

  try {
    let text = ''
    if (!useChat) {
      text = resp.body.choices[0].text
    } else {
      text = resp.body.choices[0].message.content
    }
    if (!text) {
      log.error({ body: resp.body }, 'OpenAI request failed: Empty response')
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
      return
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
    return { url: user.koboldUrl, changed: true }
  }

  return { url: baseUrl, changed: false }
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
