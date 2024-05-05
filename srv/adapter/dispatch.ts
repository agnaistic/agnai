import needle from 'needle'
import { eventGenerator } from '/common/util'

export async function* getTextgenCompletion(
  service: string,
  url: string,
  payload: any,
  headers: any
): AsyncGenerator<any> {
  const resp = await needle('post', url, JSON.stringify(payload), {
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))

  if ('err' in resp) {
    if ('syscall' in resp.err && 'code' in resp.err) {
      yield { error: `${service} request failed: Service unreachable - ${resp.err.code}` }
      return
    }

    yield { error: `${service} request failed: ${resp.err.message || resp.err}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body.message || resp.body.error?.message || resp.statusMessage || 'Unknown error'
    yield { error: `${service} request failed (${resp.statusCode}): ${msg}` }
    return
  }

  try {
    const text = resp.body.results?.[0]?.text
    if (!text) {
      yield {
        error: `${service} request failed: Received empty response. Please try again.`,
      }
      return
    }
    yield { token: text }
    return text
  } catch (ex: any) {
    yield { error: `${service} request failed: ${ex.message || ex}` }
  }
}

export function llamaStream(host: string, payload: any) {
  const accums: string[] = []
  const resp = needle.post(host + '/completion', JSON.stringify(payload), {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const emitter = eventGenerator<{ token?: string; response?: string; error?: string } | string>()
  resp.on('header', (code, _headers) => {
    if (code >= 201) {
      emitter.push({ error: `[${code}] Request failed` })
      emitter.done()
    }
  })

  resp.on('done', () => {
    emitter.push(accums.join(''))
    emitter.done()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = chunk.toString()
    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l)

    for (const msg of messages) {
      const event: any = parseEvent(msg)

      if (!event.content) {
        continue
      }

      accums.push(event.content)
      emitter.push({ token: event.content })
    }
  })

  return emitter.stream
}

export function exllamaStream(host: string, payload: any) {
  const accums: string[] = []
  const resp = needle.post(host + '/completion', JSON.stringify(payload), {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const emitter = eventGenerator<{ token?: string; response?: string; error?: string } | string>()
  resp.on('header', (code, _headers) => {
    if (code >= 201) {
      emitter.push({ error: `[${code}] Request failed` })
      emitter.done()
    }
  })

  resp.on('done', () => {
    emitter.push(accums.join(''))
    emitter.done()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = chunk.toString()
    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l)

    for (const msg of messages) {
      const event: any = parseEvent(msg)

      if (!event.content) {
        continue
      }

      accums.push(event.content)
      emitter.push({ token: event.content })
    }
  })

  return emitter.stream
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
    if (prop === 'data') {
      const data = JSON.parse(value)
      Object.assign(event, data)
    }
  }

  return event
}
