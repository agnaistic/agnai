import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { BOT_REPLACE, getPromptParts, SELF_REPLACE } from '../../common/prompt'
import { getEncoder } from '../../common/tokenize'
import { OPENAI_MODELS } from '../../common/adapters'

const baseUrl = `https://api.openai.com/v1`

type OpenAIMessagePropType = {
  role: 'user' | 'assistant' | 'system'
  content: string
}
export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, settings, sender, log, guest, lines } = opts
  if (!user.oaiKey) {
    yield { error: `OpenAI request failed: Not OpenAI API key not set. Check your settings.` }
    return
  }
  const oaiModel = settings.oaiModel ?? defaultPresets.openai.oaiModel

  const body: any = {
    model: oaiModel,
    temperature: settings.temperature ?? defaultPresets.openai.temp,
    max_tokens: settings.max_tokens ?? defaultPresets.openai.maxTokens,
    presence_penalty: settings.presence_penalty ?? defaultPresets.openai.presencePenalty,
    frequency_penalty: settings.frequency_penalty ?? defaultPresets.openai.frequencyPenalty,
  }

  const promptParts = getPromptParts(opts, opts.lines || [])

  const turbo = oaiModel === OPENAI_MODELS.Turbo
  if (turbo) {
    const encoder = getEncoder('openai', OPENAI_MODELS.Turbo)
    const user = sender.handle || 'You'

    const messages: OpenAIMessagePropType[] = [{ role: 'system', content: promptParts.gaslight }]
    const history: OpenAIMessagePropType[] = []

    const all = []

    let maxBudget =
      (settings.maxContextLength || defaultPresets.basic.maxContextLength) - settings.max_tokens

    let tokens = encoder(promptParts.gaslight)

    if (lines) all.push(...lines)

    for (const line of all) {
      let role: 'user' | 'assistant' | 'system' = 'assistant'
      const isBot = line.startsWith(char.name)
      const isUser = line.startsWith(sender.handle)
      const content = line
        .substring(line.indexOf(':') + 1)
        .trim()
        .replace(BOT_REPLACE, char.name)
        .replace(SELF_REPLACE, user)

      if (isBot) {
        role = 'assistant'
      } else if (isUser) {
        role = 'user'
      } else if (line === '<START>') {
        role = 'system'
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

  const bearer = !!guest ? `Bearer ${user.oaiKey}` : `Bearer ${decryptText(user.oaiKey)}`

  const headers = {
    'Content-Type': 'application/json',
    Authorization: bearer,
  }

  log.debug(body, 'OpenAI payload')

  const url = turbo ? `${baseUrl}/chat/completions` : `${baseUrl}/completions`
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
    yield { error: `OpenAI request failed: ${resp.statusMessage}` }
    return
  }

  try {
    let text = ''
    if (!turbo) {
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
