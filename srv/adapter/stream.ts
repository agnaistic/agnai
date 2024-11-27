import { WebSocket } from 'ws'
import { EventGenerator, eventGenerator } from '/common/util'
import { ThirdPartyFormat } from '/common/adapters'
import { logger } from '../middleware'
import needle from 'needle'
import { AsyncDelta, Completion, CompletionGenerator } from './type'
import * as partial from 'partial-json'

export type ServerSentEvent = {
  id?: string
  type?: string
  data?: any
  error?: string
  index?: number
}

/**
 * Yields individual tokens as OpenAI sends them, and ultimately returns a full completion object
 * once the stream is finished.
 */
export const streamCompletion: CompletionGenerator = async function* (
  userId,
  url,
  headers,
  body,
  service,
  log,
  format
) {
  const resp = needle.post(url, JSON.stringify(body), {
    parse: false,
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }
  let current: any = {}

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

      current = event
      prev += event.data

      // If we fail to parse we might need to parse with this bad data and the next event's data...
      // So we'll keep it and try again next iteration
      // tryParse() will attempt to parse with the current .data payload _before_ prepending with the previous attempt (if present)
      const parsed = tryParse<Completion<AsyncDelta>>(event.data, prev)
      if (!parsed) continue

      // If we successfully parsed, ensure 'prev' is cleared so subsequent tryParse attempts don't have dangling data
      prev = ''

      const { choices, ...evt } = parsed
      if (!choices || !choices[0]) {
        log.warn({ sse: event }, `[${service}] Received invalid SSE during stream`)

        const message = evt.error?.message
          ? `${service} interrupted the response: ${evt.error.message}`
          : `${service} interrupted the response`

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
    log.error({ err, current }, `${service} streaming request failed`)
    yield { error: `${service} streaming request failed: ${err.message}` }
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

// this is an edited and inverted ver of https://stackoverflow.com/a/70385497
function incompleteJson(data: string) {
  if (data.startsWith('{') && !data.endsWith('}')) return true
  try {
    const parsed = JSON.parse(data)
    if (parsed && typeof parsed === 'object') {
      return false
    }
  } catch {
    return true
  }
  return false
}

/**
 * Converts a Needle readable stream to an async generator which yields server-sent events.
 * Operates on Needle events, not NodeJS ReadableStream events.
 * https://github.com/tomas/needle#events
 **/
export function requestStream(
  stream: NodeJS.ReadableStream,
  format?: ThirdPartyFormat | 'openrouter'
) {
  const emitter = eventGenerator<ServerSentEvent>()
  let failed = false
  let code = 0

  stream.on('header', (statusCode, headers) => {
    const contentType = headers['content-type'] || ''
    if (statusCode > 201) {
      code = statusCode
      failed = true
      emitter.done()
    } else if (format === 'openrouter' || format === 'gemini') {
      if (
        contentType.startsWith('application/json') ||
        contentType.startsWith('text/event-stream')
      ) {
        return
      }
      emitter.push({
        error: `SSE request received unexpected content-type ${headers['content-type']}`,
      })
    } else if (format === 'ollama') {
      if (contentType.startsWith('application/x-ndjson')) return

      emitter.push({
        error: `SSE request received unexpected content-type ${headers['content-type']}`,
      })
      emitter.done()
    } else if (
      !contentType.startsWith('text/event-stream') &&
      !contentType.startsWith('application/json')
    ) {
      emitter.push({
        error: `SSE request received unexpected content-type ${headers['content-type']}`,
      })
      emitter.done()
    }
  })

  stream.on('done', () => {
    if (!emitter.isDone() && failed) {
      emitter.push({ error: `SSE request failed with status code ${code}` })
    }
    emitter.done()
  })

  let incomplete = ''
  let lastContent = ''

  stream.on('data', (chunk: Buffer) => {
    try {
      if (failed && !emitter.isDone()) {
        const result = tryParse(chunk.toString())
        const error = result?.error?.message || result?.message
        if (error) {
          emitter.push({ error: `SSE request failed: ${error}` })
          emitter.done()
        }

        return
      }

      const data = incomplete + chunk.toString()
      incomplete = ''

      if (format === 'gemini') {
        const index = findMalformedStart(data)
        if (index === -1) {
          return
        }
        const partialJson = data.slice(index)
        const json = partial.parse(partialJson, partial.ALL)

        const candidates = Array.isArray(json) ? json[0]?.candidates : json?.candidates
        const content = candidates ? candidates[0]?.content?.parts?.[0]?.text : null

        if (content) {
          if (content === lastContent) {
            lastContent = content
            return
          }

          if (lastContent && content.endsWith(lastContent)) {
            lastContent = content
            return
          }

          lastContent = content
          emitter.push({ data: JSON.stringify({ token: content }) })
          return
        }
        // Fallback method
        const start = data.indexOf('"text": "')
        if (start === -1) return
        const end = data.slice(start + 9).indexOf('"\n  ')

        if (end === -1) return
        const tokens = data.slice(start + 9, start + 9 + end)
        if (tokens) {
          emitter.push({ data: JSON.stringify({ token: JSON.parse('"' + tokens + '"') }) })
        }
        return
      }

      const messages = data
        .split(/\r?\n\r?\n/)
        .filter((l) => !!l && l !== ': OPENROUTER PROCESSING')

      for (const msg of messages) {
        if (format === 'vllm') {
          const event = parseVLLM(incomplete + msg)
          if (!event) continue

          const choice = event.choices?.[0]
          if (!choice) {
            continue
          }

          const token = choice.delta?.content || choice.text
          if (!token) continue

          const data = JSON.stringify({ token })
          emitter.push({ data })
          continue
        }

        if (format === 'ollama') {
          const event = parseOllama(incomplete + msg, emitter)

          if (event.error) {
            const data = JSON.stringify({ error: event.error })
            emitter.push({ data })
            continue
          }

          const token = event?.response
          if (!token) continue

          const data = JSON.stringify({ token })
          emitter.push({ data })
          continue
        }

        if (format === 'aphrodite') {
          const event = parseAphrodite(incomplete + msg, emitter)
          if (!event?.data) {
            incomplete += msg
            continue
          }

          const token = getAphroditeToken(event.data)
          if (!token) continue

          const data = JSON.stringify({ index: token.index, token: token.token })
          emitter.push({ data })
          continue
        }

        const event: any = parseEvent(msg)

        if (!event.data) {
          continue
        }

        const eventData: string = event.data
        if (typeof eventData === 'string' && incompleteJson(eventData)) {
          incomplete = msg
          continue
        }

        if (event.event) {
          event.type = event.event
        }
        emitter.push(event)
      }
    } catch (ex) {
      logger.error({ err: ex, format }, `Unhandled ${format} event stream parsing error`)
      emitter.push({ error: `Unexpected error occurred while parsing event stream` })
    }
  })

  return emitter.stream
}

function getAphroditeToken(data: any) {
  const choice = data.choices?.[0]
  if (!choice) return

  const token = choice.text

  return { token, index: choice.index }
}

function parseVLLM(msg: string) {
  if (msg.startsWith('data')) {
    msg = msg.slice(6)
  }
  try {
    const json = JSON.parse(msg.trim())
    return json
  } catch (ex) {}
}

function parseAphrodite(msg: string, emitter: EventGenerator<ServerSentEvent>) {
  const event: any = {}
  for (const line of msg.split(/\r?\n/)) {
    const pos = line.indexOf(':')
    if (pos === -1) {
      continue
    }

    const toParse = line.substring(line.indexOf('{'))

    if (incompleteJson(toParse)) {
      event['data'] = toParse
      return event
    }

    event['data'] = JSON.parse(toParse)
  }

  return event
}

function parseOllama(msg: string, emitter: EventGenerator<ServerSentEvent>) {
  const event: any = {}
  const data = tryParse(msg)
  if (!data) return event

  Object.assign(event, data)
  return event
}

function tryParse<T = any>(value: string, prev?: string): T | undefined {
  try {
    const parsed = JSON.parse(value)
    return parsed
  } catch (ex) {}

  if (prev) {
    try {
      const parsed = JSON.parse(prev + value)
      return parsed
    } catch (ex) {}
  }

  return
}

function parseEvent(msg: string) {
  const event: any = {}
  for (const line of msg.split(/\r?\n/)) {
    const pos = line.indexOf(':')
    if (pos === -1) {
      continue
    }

    const prop = line.slice(0, pos)
    const value = line.slice(pos + 1).trim()
    event[prop] = prop === 'data' ? value.trimStart() : value.trim()
  }

  return event
}

export async function websocketStream(opts: { url: string; body: any }, timeoutMs?: number) {
  const socket = new WebSocket(opts.url.replace('https:', 'wss:').replace('http:', 'ws:'))

  const emitter = eventGenerator()
  let accum = ''

  // Terminate the request if the first token is not received without the timeout window
  const ttfbTimer = timeoutMs
    ? setTimeout(() => {
        emitter.push({ error: `request cancelled - timed out` })
        emitter.done()
      }, timeoutMs)
    : 0

  socket.on('error', (err) => {
    if ('syscall' in err && 'code' in err) {
      emitter.push({ error: `Service unreachable - ${err.code}` })
      emitter.done()
      return
    }

    emitter.push({ error: err.message || 'failed to connect to inference server' })
    logger.error({ err }, 'Inference connection error')
    emitter.done()
  })

  socket.on('open', () => {
    socket.send(JSON.stringify(opts.body))
  })

  socket.on('close', () => {
    emitter.done()
  })

  socket.on('message', (data: any) => {
    const obj = JSON.parse(data)

    if (obj.response_type === 'chunk') {
      clearTimeout(ttfbTimer)
      emitter.push({ token: obj.chunk })
      accum += obj.chunk
    }

    if (obj.event === 'text_stream') {
      clearTimeout(ttfbTimer)
      emitter.push({ token: obj.text })
      accum += obj.text
    }

    if (obj.meta) {
      emitter.push({ meta: obj.meta })
    }

    if (obj.event === 'error') {
      emitter.push({ error: obj.error })
    }

    if (obj.event === 'stream_end' || obj.response_type === 'full') {
      const text = obj.text ? obj.text : accum
      emitter.push(text)
      emitter.done()
      socket.close()
    }
  })

  return emitter.stream
}

function findMalformedStart(json: string) {
  const brace = json.indexOf('{')
  const bracket = json.indexOf('[')

  return Math.min(brace, bracket)
}
