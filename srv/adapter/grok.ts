import { decryptText } from '../db/util'
import { ModelAdapter } from './type'
import { joinUrl, sanitise } from '/common/requests/util'
import { streamGenerator } from '/common/requests/stream'
import { getJsonSchemaPayload } from '/common/guidance/json-schema'
import { stripImageContent, toChatMessages } from '/common/template-messages'
import { getEncoderByName } from '../tokenize'
import { requestFullCompletion } from './chat-completion'
import { AppSchema } from '/common/types'
import { grokSpec, type GrokEffort } from './grok-preset'

export {
  GROK_PRESET_SETTINGS,
  grokModelPatch,
  grokPresetDefaults,
  grokSpec,
} from './grok-preset'
export type { GrokEffort, GrokModelSpec } from './grok-preset'

const GROK_URL = 'https://api.x.ai/v1'

export const handleGrok: ModelAdapter = async function* (opts) {
  if (!opts.gen.thirdPartyKey) {
    yield { error: 'Grok API key not set. Add an xAI key to this provider.' }
    return
  }

  const key = opts.guest ? opts.gen.thirdPartyKey : decryptText(opts.gen.thirdPartyKey)
  const model = opts.gen.thirdPartyModel || opts.gen.grokModel || 'grok-4.7'

  const counter = getEncoderByName('llama3')
  let messages = opts.messages
  if (!messages) {
    const res = await toChatMessages(opts, counter.count)
    messages = res.messages
  }

  const body: Record<string, any> = {
    model,
    messages,
    stream: !!opts.gen.streamResponse,
    temperature: clampNumber(opts.gen.temp, 0, 2),
    max_completion_tokens: opts.gen.maxTokens,
    top_p: clampNumber(opts.gen.topP, 0, 1),
  }

  const effort = grokReasoningEffort(opts.gen, model)
  if (effort) {
    body.reasoning_effort = effort
  }

  if (opts.jsonSchema) {
    body.response_format = getJsonSchemaPayload(opts.jsonSchema, 'openai', opts)
  }

  const base = (opts.gen.thirdPartyUrl || GROK_URL).replace(/\/$/, '')
  const url = base.endsWith('/chat/completions') ? base : joinUrl(base, 'chat/completions')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }

  if (opts.chat?._id) {
    headers['x-grok-conv-id'] = opts.chat._id
  }

  opts.log.debug({ ...body, messages: undefined }, 'Grok payload')

  yield { prompt: JSON.stringify(stripImageContent(messages), null, 2) }

  const iter = body.stream
    ? streamGenerator({
        userId: opts.user._id,
        url,
        headers,
        body,
        service: 'Grok',
        log: opts.log,
        signal: opts.signal,
      })
    : requestFullCompletion({
        userId: opts.user._id,
        url,
        headers,
        body,
        service: 'Grok',
        log: opts.log,
        signal: opts.signal,
        format: 'openai-chatv2',
      })

  let accum = ''
  let response: any

  while (true) {
    const generated = await iter.next()

    if (generated.done) {
      response = generated.value
      break
    }

    if (!generated.value) continue

    if ('thoughts' in generated.value && generated.value.thoughts) {
      yield { thoughts: generated.value.thoughts }
    }

    if ('error' in generated.value && generated.value.error) {
      const error = generated.value.error
      yield { error: `[Grok] response failed: ${typeof error === 'string' ? error : JSON.stringify(error)}` }
      return
    }

    if ('token' in generated.value && generated.value.token) {
      accum += generated.value.token
      yield { partial: accum }
    }

    if ('meta' in generated.value) {
      yield { meta: generated.value.meta }
    }

    if ('tokens' in generated.value && typeof generated.value.tokens === 'string') {
      accum = generated.value.tokens
    }
  }

  const choice = response?.choices?.[0]
  const text = accum || choice?.message?.content || choice?.text || ''

  if (response?.error?.message && !text) {
    yield { error: `[Grok] response failed: ${response.error.message}` }
    return
  }

  if (!text) {
    opts.log.error({ body: response }, 'Grok request failed: Empty response')
    yield { error: '[Grok] response failed: Received empty response. Try again.' }
    return
  }

  yield { meta: { model, stop: choice?.finish_reason } }
  yield sanitise(text)
}

function grokReasoningEffort(gen: Partial<AppSchema.GenSettings>, model: string) {
  const spec = grokSpec(model)
  if (spec.reasoning === 'unsupported' || !gen.reasoning?.enabled) return

  const effort = gen.reasoning.effort || 'high'
  if ((spec.efforts as string[]).includes(effort)) return effort as GrokEffort
  if (effort === 'xhigh') return 'high'

  if (effort === 'custom') {
    const max = Math.max(gen.maxTokens ?? 2048, 2048)
    const budget = gen.reasoning.maxTokens ?? 0
    const percent = budget / max
    if (percent >= 0.65) return 'high'
    if (percent >= 0.35) return 'medium'
    return 'low'
  }
}

function clampNumber(value: number | undefined, min: number, max: number) {
  if (value === undefined || Number.isNaN(value)) return
  return Math.min(max, Math.max(min, value))
}
