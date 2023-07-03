import needle from 'needle'
import { decryptText } from '../db/util'
import { toChatCompletionPayload } from './chat-completion'
import { registerAdapter } from './register'
import { ModelAdapter } from './type'
import { sanitiseAndTrim } from '../api/chat/common'
import { AppLog } from '../logger'

const baseUrl = 'https://openrouter.ai/api/v1'
const chatUrl = `${baseUrl}/chat/completions`

export const handleOpenRouter: ModelAdapter = async function* (opts) {
  const { user, guest } = opts

  const key = user.adapterConfig?.openrouter?.apiKey
  if (!key) {
    yield {
      error:
        'OpenRouter request failed: Set your API key in the settings page. Visit openrouter.ai/keys to generate one.',
    }
    return
  }
  const handle = opts.impersonate?.name || opts.sender.handle || 'You'
  const payload: any = {
    prompt: opts.prompt,
    // 256 is the OpenRouter default. We will use this.
    temperature: opts.gen.temp,
    max_tokens: opts.gen.maxTokens ?? 256,
    stop: [`${handle}:`],
  }

  const format = user.adapterConfig?.openrouter?.format || 'chat'

  if (format === 'chat') {
    payload.messages = toChatCompletionPayload(opts, payload.max_tokens)
  } else {
    payload.prompt = opts.prompt
  }

  const headers = {
    Authorization: `Bearer ${guest ? key : decryptText(key)}`,
    'HTTP-Referer': 'Agnaistic',
  }

  const res = getCompletion(payload, headers)
  let accum = ''
  let response: any

  opts.log.debug(payload, 'OpenRouter payload')

  while (true) {
    const gen = await res.next()
    if (gen.done) {
      response = gen.value
      break
    }

    if ('error' in gen.value) {
      yield gen.value
      return
    }

    if ('token' in gen.value) {
      accum += gen.value.token
    }
  }

  const text = getResponseText(response, opts.log)
  if (text instanceof Error) {
    yield { error: `OpenRouter response failed: ${text.message}` }
    return
  }

  if (!text?.length) {
    opts.log.error({ body: response }, 'OpenRouter request failed: Empty response')
    yield { error: `OpenRouter request failed: Received empty response. Try again.` }
    return
  }

  yield sanitiseAndTrim(text, opts.prompt, opts.replyAs, opts.characters, opts.members)
}

async function* getCompletion(payload: any, headers: any): AsyncGenerator<any> {
  const resp = await needle('post', chatUrl, JSON.stringify(payload), {
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))

  if ('err' in resp) {
    yield { error: `OpenRouter request failed: ${resp.err.message || resp.err}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body.message || resp.body.error?.message || resp.statusMessage || 'Unknown error'
    yield { error: `OpenRouter request failed (${resp.statusCode}): ${msg}` }
    return
  }

  return resp.body
}

registerAdapter('openrouter', handleOpenRouter, {
  label: 'OpenRouter',
  settings: [
    {
      field: 'apiKey',
      label: 'API Key',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. sk-or-v1-2v6few...' },
    },
    {
      field: 'format',
      label: 'Prompt format. Use "chat completion" for OpenAI models.',
      secret: false,
      setting: {
        type: 'list',
        options: [
          { label: 'Plain text', value: 'plain' },
          { label: 'Chat Completion', value: 'chat' },
        ],
      },
    },
  ],
  options: ['temp', 'maxTokens'],
})

function getResponseText(resp: any, log: AppLog) {
  if (typeof resp === 'string') {
    resp = JSON.parse(resp)
  }

  if (!resp.choices || !Array.isArray(resp.choices) || resp.choices.length === 0) {
    log.warn({ resp }, 'OpenRouter response was empty (No choices)')
    return new Error(`Response contained no data (No choices)`)
  }

  const message = resp.choices[0].message
  if (!message || !message.content) {
    log.warn({ resp }, 'OpenRouter response was empty (No text')
    return new Error(`Response contained no data (No text)`)
  }

  return message.content as string
}
