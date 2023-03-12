import needle from 'needle'
import { sanitise, trimResponse } from '../api/chat/common'
import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { formatCharacter } from '../../common/prompt'

const baseUrl = `https://api.openai.com/v1`

type OpenAIMessagePropType = {
  role: 'user' | 'assistant' | 'system'
  content: string
}
export const handleOAI: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  settings,
  sender,
  log,
}) {
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

  const turbo = oaiModel === 'gpt-3.5-turbo'
  if (turbo) {
    // i looked at miku code before writing this
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L86
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L65
    const conversation = prompt.replace(char.greeting, '')
    const lines = conversation.split('\n')
    const messages: OpenAIMessagePropType[] = [
      {
        role: 'system',
        content: settings.gaslight
          .replace(/\{\{name\}\}/g, char.name)
          .replace(/\{\{char\}\}/g, char.name)
          .replace(/\{\{user\}\}/g, sender.handle || 'You')
          .replace(/\{\{personality\}\}/g, formatCharacter(char.name, char.persona))
          .replace(/\{\{scenario\}\}/g, char.scenario),
      },
    ]

    for (const line of lines) {
      const startsChar = line.startsWith(char.name)
      messages.push({
        role: startsChar ? 'assistant' : 'user',
        content: line.substring(line.indexOf(':')),
      })
    }

    body.messages = messages
  } else {
    body.prompt = prompt
  }

  const bearer = user._id === "anon" ? `Bearer ${user.oaiKey}` : `Bearer ${decryptText(user.oaiKey)}`

  const headers = {
    'Content-Type': 'application/json',
    Authorization: bearer,
  }

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
    log.error({ body: resp.body }, 'OpenAI request failed')
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
