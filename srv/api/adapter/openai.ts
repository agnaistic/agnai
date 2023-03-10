/**
 * GPT-3.5-turbo
 */

import needle from 'needle'
import { config } from '../../config'
import { logger } from '../../logger'
import { sanitise, trimResponse } from '../chat/common'
import { ModelAdapter } from './type'
import { decryptText } from '../../db/util'
import { createInterface } from 'readline'

const defaultUrl = `https://api.openai.com/v1`

export const handleOAI: ModelAdapter = async function* ({ char, members, user, prompt, settings, chat }) {
  if(!user.oaiKey) {
    yield { error: `OpenAI request failed: Not configured` }
    return
  }

  const oaiModel = settings.oaiModel
  
  let body = {}

  const turbo: boolean = oaiModel === "gpt-3.5-turbo";
  if(turbo) {
    // i looked at miku code before writing this
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L86
    // https://github.com/miku-gg/miku/blob/master/packages/extensions/src/chat-prompt-completers/OpenAIPromptCompleter.ts#L65
    interface OpenAIMessagePropType {
      role: 'user' | 'assistant' | 'system',
      content: string,
    };
    const conversation = prompt.replace(char.greeting,"")
    const lines = conversation.split("\n")
    let messages: OpenAIMessagePropType[] = [
      { role: 'system', content: settings.gaslight
                                .replace("{{name}}",char.name)
                                .replace("{{user}}",members.find((mem) => mem.userId === chat.userId)?.handle || 'You')
                                .replace("{{personality}}",char.persona)
      },
    ]
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const startsChar = line.startsWith(char.name)
      messages.push({role: (startsChar ? "assistant" : "user"),content: line.substring(line.indexOf(":"))});
    }
    body = {
      messages: messages,
      model: oaiModel,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      presence_penalty: settings.presence_penalty,
      frequency_penalty: settings.frequency_penalty,
    }
  } else {
    body = {
      prompt: prompt,
      model: oaiModel,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      presence_penalty: settings.presence_penalty,
      frequency_penalty: settings.frequency_penalty,
    }
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptText(user.oaiKey)}` }

  const resp = await needle(
    'post',
    turbo ? `${defaultUrl}/chat/completions` : `${defaultUrl}/completions`,
    JSON.stringify(body),
    { json: true, headers }
  ).catch((err) => ({ error: err }))
  if ('error' in resp) {
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `OpenAI request failed: ${resp.statusMessage}` }
    return
  }

  try {
    let text = ""
    if(oaiModel === "text-davinci-003") {
      text = resp.body["choices"][0]["text"]
    } else {
      text = resp.body["choices"][0]["message"]["content"]
    }
    if (!text) {
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
      return
    }
    const parsed = sanitise(text.replace(prompt, ''))
    const trimmed = trimResponse(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    yield { error: `OpenAI request failed: ${ex.message}` }
    return
  }
}
