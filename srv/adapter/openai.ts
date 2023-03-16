import needle from 'needle'
import { sanitise, trimResponse } from '../api/chat/common'
import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { formatCharacter, getPromptParts } from '../../common/prompt'

const baseUrl = `https://api.openai.com/v1`

type OpenAIMessagePropType = {
  role: 'user' | 'assistant' | 'system'
  content: string
}
export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, settings, sender, log, guest, lines } = opts
  if (!user.oaiKey) {
    yield { error: `OpenAI request failed: Not configured` }
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

  const promptParts = getPromptParts(opts)

  const turbo = oaiModel === 'gpt-3.5-turbo'
  if (turbo) {
    // i looked at miku code before writing this
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L86
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L65
    const messages: OpenAIMessagePropType[] = [
      {
        role: 'system',
        content: (settings.gaslight || defaultPresets.openai.gaslight)
          .replace(/\{\{name\}\}/g, char.name)
          .replace(/\{\{char\}\}/g, char.name)
          .replace(/\{\{user\}\}/g, sender.handle || 'You')
          .replace(/\{\{personality\}\}/g, formatCharacter(char.name, char.persona))
          .replace(/\{\{scenario\}\}/g, char.scenario),
      },
    ]

    const all = []
    if (promptParts.sampleChat) all.push(...promptParts.sampleChat)
    if (lines) all.push(...lines)

    for (const line of all) {
      const isBot = line.startsWith(char.name)
      const content = line.substring(line.indexOf(':') + 1).trim()
      messages.push({
        role: isBot ? 'assistant' : 'user',
        content,
      })
    }

    body.messages = messages
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
  const resp = await needle('post', url, JSON.stringify(body), { json: true, headers }).catch(
    (err) => ({ error: err })
  )

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
    const trimmed = trimResponse(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    log.error({ err: ex }, 'OpenAI failed to parse')
    yield { error: `OpenAI request failed: ${ex.message}` }
    return
  }
}
