import needle from 'needle'
import { decryptText } from '../db/util'
import { toChatCompletionPayload } from './chat-completion'
import { registerAdapter } from './register'
import { ModelAdapter } from './type'

const baseUrl = 'https://openrouter.ai/api/v1'

export const handleOpenRouter: ModelAdapter = async function* (opts) {
  const { user, gen, guest } = opts

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
    model: '',
    prompt: opts.prompt,
    // 256 is the OpenRouter default. We will use this.
    temperature: opts.gen.temp,
    max_tokens: opts.gen.maxTokens ?? 256,
    stop: [`${handle}:`],
  }

  const format = user.adapterConfig?.openrouter?.format || 'chat'
  payload.messages = format === 'chat' ? toChatCompletionPayload(opts, payload.max_tokens) : []

  const headers = {
    Authorization: `Bearer ${guest ? key : decryptText(key)}`,
    'HTTP-Referer': 'Agnaistic',
  }
}

async function getCompletion(payload: any, headers: any) {
  const resp = await needle('post', baseUrl, JSON.stringify(payload), {
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))
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
