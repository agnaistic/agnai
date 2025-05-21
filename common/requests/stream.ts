import { ThirdPartyFormat } from '../adapters'
import { logger } from '../logger'
import { wait } from '../util'
import type { CompletionGenerator } from '/srv/adapter/type'

export type ServerSentEvent = {
  id?: string
  type?: string
  data?: any
  error?: string
  index?: number
}

const DEBUG = typeof window !== 'undefined' ? false : true

export const streamGenerator: CompletionGenerator = async function* ({
  signal,
  url,
  headers,
  body,
  format,
}) {
  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }
  // let current: any = {}

  headers['Content-Type'] = 'application/json'
  switch (format) {
    case 'featherless': {
      headers.Accept = 'application/json'
      break
    }

    case 'tabby':
      break

    default: {
      headers.Accept = 'text/event-stream'
      break
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers as any,
    body: JSON.stringify(body),
    signal: signal.signal,
  })

  const stream = fetchStream(response, { format })
  let sentTokens = false

  for await (const data of stream) {
    if (!data) continue

    if (data.token) {
      const token = data.token as string
      tokens.push(data.token)
      yield { token }
    }

    if (data.meta) {
      Object.assign(meta, data.meta)
    }

    if (data.errorObj) {
      logger.error({ err: data.errorObj }, `Exception occurred parsing fetch stream`)
    }

    if (data.error) {
      yield { error: data.error }
    }

    if (data.tokens) {
      sentTokens = true
      yield data
    }
  }

  if (!sentTokens) {
    yield { tokens: tokens.join('') }
  }
  yield { meta }

  return {
    id: meta.id,
    created: meta.created,
    model: meta.model,
    object: meta.object,
    choices: [
      {
        finish_reason: meta.finish_reason,
        index: meta.index ?? 0,
        text: tokens.join(''),
      },
    ],
  }
}

export async function* fetchStream(
  response: Response,
  opts?: {
    format?: ThirdPartyFormat | 'openrouter' | 'raw'
    marker?: RegExp
    prechunk?: (chunk: string) => string
  }
) {
  const isErrorCode = response.status > 201
  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  const sseMarker = opts?.marker || /data: (.*)(?:\n\n|\r\r|\r\n\r\n)/
  const format = opts?.format

  let buffer = ''
  const gens: string[] = []
  let accum = ''

  if (!reader) {
    yield { error: 'Response body is empty' }
    return
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      await wait(0.001)

      if (done) {
        if (buffer.trim().length > 0) {
          yield { warn: 'End of request contained incomplete data' }
          logger.debug({ buffer }, 'incomplete buffer')
          return
        }

        if (format === 'raw') {
          return
        }

        const swipes = gens.filter((g) => !!(g || '').trim())
        if (swipes.length) {
          yield { tokens: accum, gens: swipes }
        }

        yield { tokens: accum }
        return
      }

      let chunk = decoder.decode(value)
      if (DEBUG) {
        logger.debug({ chunk, buffer }, `[fetch] chunk - ${response.url}`)
      }
      if (chunk.includes(': OPENROUTER PROCESSING\n')) {
        chunk = chunk.replace(/: OPENROUTER PROCESSING/g, '').trimStart()
      }

      if (chunk.includes(': FEATHERLESS PROCESSING\n')) {
        chunk = chunk.replace(/: FEATHERLESS PROCESSING/g, '').trimStart()
      }

      if (opts?.prechunk) {
        chunk = opts.prechunk(chunk)
      }

      try {
        const error = tryParse(chunk)
        const isError = isErrorCode || !!error?.error
        if (isError && error) {
          logger.error(
            { err: error, chunk: error ? undefined : chunk, url: response.url },
            `[fetch] request failed with error ${response.status}`
          )
          yield {
            error: `inferencer returned an error ${response.status}`,
            errorObj: error ? error : chunk,
          }
          return
        }
      } catch (ex) {}

      buffer += chunk
      let match = buffer.match(sseMarker)

      while (match) {
        const data = match[1]
        const json = tryParse(data)
        if (json) {
          if (format === 'raw') {
            yield json
          } else {
            const token: string =
              getChoiceProp(json, 'content') || getChoiceProp(json, 'text') || json.response || ''
            const index = +(getChoiceProp<string>(json, 'index') || '0')

            if (token !== undefined) {
              if (index > 0) {
                if (!gens[index]) gens[index] = ''
                gens[index] += token
              } else {
                accum += token
                yield { token, index }
              }
            } else {
              logger.info({ json }, `[${format || 'fetch'}] cannot get token`)
            }

            const meta: any = {}

            getChoiceProp(json, 'id')
            getChoiceProp(json, 'created', meta)
            getChoiceProp(json, 'model', meta)
            getChoiceProp(json, 'object')
            getChoiceProp(json, 'finish_reason', meta)

            yield { meta }
          }
        } else {
          logger.info({ chunk }, `[${format || 'fetch'}] cannot parse chunk`)
        }

        try {
          buffer = buffer.slice(match[0].length)
          match = buffer.match(sseMarker)
        } catch (e) {
          yield { error: `Exception occurred while parsing response stream`, errorObj: e }
          return
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function getChoiceProp<T = any>(json: any, prop: string, assign?: any) {
  const choice = json?.choices?.[0]
  const value = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]

  if (assign && value) {
    assign[prop] = value
  }

  return value as T
}

// this is an edited and inverted ver of https://stackoverflow.com/a/70385497
export function incompleteJson(data: string) {
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

function tryParse(value: any) {
  try {
    const obj = JSON.parse(value)
    return obj
  } catch (ex) {
    return {}
  }
}

export function parseEvent(msg: string) {
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
