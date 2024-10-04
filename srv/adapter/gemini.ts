import needle from 'needle'
import { decryptText } from '../db/util'
import { getEncoder, getEncoderByName, getTokenCounter } from '../tokenize'
import { toChatCompletionPayload } from './chat-completion'
import { getStoppingStrings } from './prompt'
import { ModelAdapter } from './type'
import { AppLog } from '../middleware'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { requestStream } from './stream'

const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/`

export const handleGemini: ModelAdapter = async function* (opts) {
  const encoder = getEncoderByName('gemma')
  const messages = await toChatCompletionPayload(opts, encoder.count, opts.gen.maxTokens!)

  const payload: any = {
    safetySettings,
    generationConfig: {
      temperature: opts.gen.temp,
      maxOutputTokens: opts.gen.maxTokens,
      topP: opts.gen.topP,
      topK: opts.gen.topK,
      stopSequences: getStoppingStrings(opts),
    },
  }

  const systems: string[] = []
  const contents: any[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systems.push(msg.content)
      continue
    }

    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: { text: msg.content } })
    continue
  }

  payload.contents = contents
  if (systems.length) {
    payload.system_instruction = {
      parts: {
        text: systems.join('\n'),
      },
    }
  }

  const key = opts.guest ? opts.gen.thirdPartyKey : decryptText(opts.gen.thirdPartyKey!)
  const url = [
    BASE_URL,
    opts.gen.thirdPartyModel,
    ':',
    opts.gen.streamResponse ? 'streamGenerateContent' : 'generateContent',
    '?key=',
    key,
  ].join('')

  const stream = opts.gen.streamResponse
    ? streamCompletion(url, payload, opts.log)
    : fullCompletion(url, payload, opts.log)

  let accum = ''

  while (true) {
    const generated = await stream.next()

    if (!generated || !generated.value) break

    if (typeof generated.value === 'string') {
      accum = generated.value
      break
    }

    if ('error' in generated.value) {
      yield { error: generated.value.error }
      return
    }

    if ('token' in generated.value) {
      accum += generated.value.token
      yield { partial: sanitiseAndTrim(accum, '', opts.replyAs, opts.characters, opts.members) }
    }

    if ('tokens' in generated.value) {
      const gens = 'gens' in generated.value ? generated.value.gens : undefined
      if (gens) {
        yield { gens, tokens: generated.value.tokens }
      }

      accum = generated.value.tokens
      break
    }
  }

  const parsed = sanitise(accum)
  const trimmed = trimResponseV2(
    parsed,
    opts.replyAs,
    opts.members,
    opts.characters,
    payload.stopSequences
  )

  yield trimmed || parsed
}

async function* streamCompletion(url: string, body: any, log: AppLog) {
  const resp = needle.post(url, body, {
    parse: false,
    json: true,
    headers: {
      Accept: 'application/json',
    },
  })

  const tokens = []

  const responses: Record<number, string> = {}

  try {
    const events = requestStream(resp, 'gemini')

    for await (const event of events) {
      if (!event.data) continue
      const data = JSON.parse(event.data) as {
        index?: number
        token: string
        final: boolean
        ptr: number
        error?: string
        choices?: Array<{ index: number; finish_reason: string; logprobs: any; text: string }>
      }

      if (data.error) {
        yield { error: `Google AI Studio streaming request failed: ${data.error}` }
        log.error({ error: data.error }, `Google AI Studio streaming request failed`)
        return
      }

      const res = data.choices ? data.choices[0] : data
      const token = 'text' in res ? res.text : res.token

      /** Handle batch generations */
      if (res.index !== undefined) {
        const index = res.index
        if (!responses[index]) {
          responses[index] = ''
        }

        responses[index] += token

        if (index === 0) {
          tokens.push(token)
          yield { token: token }
        }

        continue
      }

      tokens.push(token)
      yield { token }
    }
  } catch (err: any) {
    yield { error: `Google AI Studio streaming request failed: ${err.message || err}` }
    return
  }
}

async function* fullCompletion(url: string, body: any, log: AppLog) {
  const resp = await needle('post', url, body, {
    headers: { 'Content-Type': 'application/json' },
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `Google AI Studio request failed: ${resp.error?.message || resp.error}` }
    log.error({ error: resp.error }, `Gemini request failed`)
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `Google AI Studio request failed: ${resp.statusMessage}` }
    log.error({ error: resp.body }, `Gemini request failed`)
    return
  }

  const data = resp.body
  if (!data?.candidates?.length) {
    const reason = data?.promptFeedback?.blockReason
    if (reason) {
      yield { error: `Google AI Studio blocked the request: ${reason}` }
      log.warn({ error: data }, `Google AI Studio request blocked`)
      return
    }

    yield { error: `Google AI Studio did not return a response` }
    return
  }

  const content = data.candidates[0]?.content ?? data.candidates[0]?.output

  const tokens = typeof content === 'string' ? content : content?.parts?.[0]?.text
  if (!tokens) {
    yield { error: `Google AI Studio did not return a response` }
    log.warn({ error: data }, `Google AI Studio returned empty response`)
    return
  }

  return { tokens }
}

const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
    threshold: 'BLOCK_NONE',
  },
]
