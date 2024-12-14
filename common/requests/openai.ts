import needle from 'needle'
import { ThirdPartyFormat } from '../adapters'
import { requestStream } from './stream'
import { PayloadOpts } from './types'
import { toChatCompletionPayload } from '/srv/adapter/chat-completion'
import { notify, sanitiseAndTrim } from './util'
import { countTokens } from '../tokenize'

type Role = 'user' | 'assistant' | 'system'
export type CompletionItem = { role: Role; content: string; name?: string }

type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>
type Inference = { message: { content: string; role: Role } }
export type AsyncDelta = { delta: Partial<Inference['message']> }

type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

type LocalGenerator = (
  url: string,
  headers: Record<string, string | string[] | number>,
  body: any,
  format?: ThirdPartyFormat | 'openrouter'
) => AsyncGenerator<
  { error: string } | { error?: undefined; token: string } | Completion,
  Completion | undefined
>

export async function* handleOAI(opts: PayloadOpts, payload: any) {
  const gen = opts.settings!
  const options = { ...opts, gen }

  const messages = await toChatCompletionPayload(
    options as any,
    countTokens,
    opts.settings?.maxTokens!
  )

  payload.messages = messages
  payload.prompt = opts.prompt

  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (gen.thirdPartyKey) {
    headers.Authorization = `Bearer ${gen.thirdPartyKey}`
  }

  const suffix = gen.thirdPartyUrl?.endsWith('/') ? '' : '/'
  const urlPath = gen.thirdPartyFormat?.startsWith('openai-chat')
    ? `${suffix}chat/completions`
    : `${suffix}completions`
  const fullUrl = `${gen.thirdPartyUrl}${urlPath}`

  if (!gen.streamResponse) {
    const result = await requestFullCompletion(fullUrl, headers, payload)
    if ('error' in result) {
      yield result
      return
    }

    const text = getCompletionContent(result)
    if (text instanceof Error) {
      yield { error: `request returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      yield { error: `request failed: Received empty response. Try again.` }
      return
    }

    yield sanitiseAndTrim(text, opts.prompt, opts.replyAs, opts.characters, opts.members)
    return
  }

  const iter = streamCompletion(fullUrl, headers, payload, gen.thirdPartyFormat!)

  let accumulated = ''
  let response: Completion<Inference> | undefined

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if (generated.value.error) {
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield {
        partial: sanitiseAndTrim(
          accumulated,
          opts.prompt,
          opts.char,
          opts.characters,
          opts.members
        ),
      }
    }
  }

  try {
    let text = getCompletionContent(response)
    if (text instanceof Error) {
      yield { error: `request returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      yield { error: `request failed: Received empty response. Try again.` }
      return
    }

    yield sanitiseAndTrim(text, opts.prompt, opts.replyAs, opts.characters, opts.members)
  } catch (ex: any) {
    yield { error: `request failed: ${ex.message}` }
    return
  }
}

/**
 * Yields individual tokens as OpenAI sends them, and ultimately returns a full completion object
 * once the stream is finished.
 */
export const streamCompletion: LocalGenerator = async function* (url, headers, body, format) {
  const resp = needle.post(url, JSON.stringify(body), {
    parse: false,
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }

  try {
    const events = requestStream(resp, format)
    let prev = ''
    for await (const event of events) {
      if (event.error) {
        yield { error: event.error }
        return
      }

      if (!event.data) {
        continue
      }

      if (event.type === 'ping') {
        continue
      }

      if (event.data === '[DONE]') {
        break
      }

      prev += event.data

      // If we fail to parse we might need to parse with this bad data and the next event's data...
      // So we'll keep it and try again next iteration
      // tryParse() will attempt to parse with the current .data payload _before_ prepending with the previous attempt (if present)
      const parsed = tryParse<Completion<AsyncDelta>>(event.data, prev)
      if (!parsed) continue

      // If we successfully parsed, ensure 'prev' is cleared so subsequent tryParse attempts don'ttoastStoredangling data
      prev = ''

      const { choices, ...evt } = parsed
      if (!choices || !choices[0]) {
        notify().warn(`[local] Received invalid SSE during stream`)

        const message = evt.error?.message
          ? `local interrupted the response: ${evt.error.message}`
          : `local interrupted the response`

        if (!tokens.length) {
          yield { error: message }
          return
        }

        break
      }

      const { finish_reason, index, ...choice } = choices[0]

      meta = { ...evt, finish_reason, index }

      if ('text' in choice) {
        const token = choice.text
        tokens.push(token)
        yield { token }
      } else if ('delta' in choice && choice.delta.content) {
        const token = choice.delta.content
        tokens.push(token)
        yield { token }
      }
    }
  } catch (err: any) {
    notify().error(`local streaming request failed`)
    yield { error: `local streaming request failed: ${err.message}` }
    return
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

export async function requestFullCompletion(url: string, headers: any, body: any) {
  try {
    const resp = await needle('post', url, JSON.stringify(body), {
      json: true,
      response_timeout: 0,
      read_timeout: 0,
      open_timeout: 90000,
      headers,
    }).catch((err) => ({ error: err }))

    if ('error' in resp) {
      return { error: `Local request failed: ${resp.error?.message || resp.error}` }
    }

    if (resp.statusCode && resp.statusCode >= 400) {
      const msg =
        resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

      return { error: `Local request failed (${resp.statusCode}): ${msg}` }
    }

    return resp.body
  } catch (ex: any) {
    return { error: ex?.message || ex }
  }
}

function tryParse<T = any>(value: string, prev?: string): T | undefined {
  try {
    const parsed = JSON.parse(value)
    return parsed
  } catch (ex) {}

  try {
    const parsed = JSON.parse(prev + value)
    return parsed
  } catch (ex) {}

  return
}

function getCompletionContent(completion: Completion<Inference> | undefined) {
  if (!completion) {
    return ''
  }

  if (completion.error?.message) {
    return new Error(completion.error.message)
  }

  if ('text' in completion.choices[0]) {
    return completion.choices[0].text
  } else {
    return completion.choices[0].message.content
  }
}
