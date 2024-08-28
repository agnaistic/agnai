import { ThirdPartyFormat } from '../adapters'
import { eventGenerator } from '../util'

export type ServerSentEvent = {
  id?: string
  type?: string
  data?: any
  error?: string
  index?: number
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

  stream.on('header', (statusCode, headers) => {
    const contentType = headers['content-type'] || ''
    if (statusCode > 201) {
      emitter.push({ error: `SSE request failed with status code ${statusCode}` })
      emitter.done()
    } else if (format === 'openrouter') {
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
    } else if (!contentType.startsWith('text/event-stream')) {
      emitter.push({
        error: `SSE request received unexpected content-type ${headers['content-type']}`,
      })
      emitter.done()
    }
  })

  stream.on('done', () => {
    emitter.done()
  })

  let incomplete = ''

  stream.on('data', (chunk: Buffer) => {
    const data = incomplete + chunk.toString()
    incomplete = ''

    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l && l !== ': OPENROUTER PROCESSING')

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
        const event = parseOllama(incomplete + msg)

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
        const event = parseAphrodite(incomplete + msg)
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

      const data: string = event.data
      if (typeof data === 'string' && incompleteJson(data)) {
        incomplete = msg
        continue
      }

      if (event.event) {
        event.type = event.event
      }
      emitter.push(event)
    }
  })

  return emitter.stream
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

function parseAphrodite(msg: string) {
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

function parseOllama(msg: string) {
  const event: any = {}
  const data = tryParse(msg)
  if (!data) return event

  Object.assign(event, data)
  return event
}

function tryParse(value: any) {
  try {
    const obj = JSON.parse(value)
    return obj
  } catch (ex) {
    return {}
  }
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
