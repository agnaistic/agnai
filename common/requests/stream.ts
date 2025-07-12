import { ThirdPartyFormat } from '../adapters'
import type { AppLog } from '../logger'
import { round } from '../util'
import type { CompletionGenerator } from '/srv/adapter/type'

export type ServerSentEvent = {
  id?: string
  type?: string
  data?: any
  error?: string
  index?: number
}

const DEBUG =
  typeof window !== 'undefined'
    ? false
    : typeof process !== 'undefined'
    ? process.env.LOG_LEVEL === 'debug' && !!process.env.LOG_CHUNKS
    : false

export const streamGenerator: CompletionGenerator = async function* (opts) {
  const { signal, url, headers, body, format } = opts

  const tokens = []
  const start = Date.now()
  let meta: any = {
    model: '',
    stop: '',
  }
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
  }).catch((err) => ({ err }))

  if ('err' in response) {
    const err = response.err
    const message = err?.message || err
    yield {
      error: `Request failed: ${message || 'unexpect error occurred'}`,
      errorObj: err,
    }
    return
  }

  let errored = false
  let sentError = false

  if (response.status === 404) {
    errored = true
  }

  if (response.status === 401) {
    yield {
      error: `Request failed with 401 Unauthorized: Check your API key`,
    }
    return
  }

  if (response.status >= 400) {
    errored = true
  }

  const stream = fetchStream(response, { format, log: opts.log })
  let sentTokens = false
  let errorObj: any = undefined

  for await (const data of stream) {
    if (!data) continue

    if (data.token) {
      if (!meta.wait) {
        meta.wait = round((Date.now() - start) / 1000, 2)
      }

      const token = data.token as string
      tokens.push(data.token)
      yield { token }
    }

    if (data.meta) {
      if (data.meta.finish_reason) meta.stop = data.meta.finish_reason
      if (data.meta.model) meta.model = meta.model = data.meta.model
    }

    if (data.error) {
      sentError = true
      yield { error: data.error, errorObj: data.errorObj }
    }

    if (data.error || data.errorObj) {
      errorObj = data.errorObj
      opts.log?.error(
        { err: data.error, obj: data.errorObj },
        `Exception occurred parsing fetch stream`
      )
    }

    if (data.tokens) {
      sentTokens = true
      yield data
    }
  }

  if (errored && !sentError) {
    switch (response.status) {
      case 404: {
        yield {
          error: `Request failed with 404 Not Found: Check your URL`,
          errorObj,
        }
        break
      }

      default: {
        yield {
          error: `Request failed: ${response.status} ${response.statusText}`,
          errorObj,
        }
        break
      }
    }

    return
  }

  meta.time = round((Date.now() - start) / 1000, 2)

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
    log?: AppLog
    format?: ThirdPartyFormat | 'openrouter' | 'raw'
    marker?: RegExp
    prechunk?: (chunk: string) => string
  }
) {
  const isErrorCode = response.status > 201
  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  const format = opts?.format

  let buffer = ''
  const gens: string[] = []

  let thoughts = ''
  let accum = ''

  if (!reader) {
    yield { error: 'Response body is empty' }
    return
  }

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (buffer.trim().length > 0) {
          yield { warn: 'End of request contained incomplete data' }
          opts?.log?.warn({ buffer }, '[fetch] incomplete buffer')
          return
        }

        if (format === 'raw') {
          return
        }

        const swipes = gens.filter((g) => !!(g || '').trim())
        if (swipes.length) {
          yield { tokens: accum, gens: swipes }
        }

        if (DEBUG) {
          console.log(`[fetch] response: ${accum}`)
        }
        yield { tokens: thoughts + accum }
        return
      }

      let chunk = decoder.decode(value)

      if (DEBUG) {
        console.log(
          `[fetch] chunk - ${response.url}\n${JSON.stringify({ chunk, buffer }, null, 2)}`
        )
      }

      if (chunk.includes(': OPENROUTER PROCESSING\n')) {
        chunk = chunk.replace(/: OPENROUTER PROCESSING/g, '').trimStart()

        // if (accum.length > 0) {
        //   console.warn('[processing] warning: are we done here?')
        // }
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
          // OpenRouter provider errors
          const suberror = tryParse(error?.error?.metadata?.raw)
          const providerError =
            suberror?.detail ||
            suberror?.message ||
            suberror?.error?.message ||
            error?.error?.metadata?.raw

          const msg = error?.error?.message || error?.message || `status code ${response.status}`

          const finalMsg = [msg, providerError].filter((m) => !!m).join(' - ')

          opts?.log?.error(
            { err: error, chunk: error ? undefined : chunk, url: response.url, msg: finalMsg },
            `Request failed with error ${response.status}`
          )

          yield {
            error: `${finalMsg}`,
            errorObj: error ? error : chunk,
          }
          return
        }
      } catch (ex) {}

      buffer += chunk

      let match = processBuffer(buffer)

      while (match) {
        const data = match.match
        const json = tryParse(data)
        if (json) {
          if (format === 'raw') {
            yield json
          } else if (json?.error) {
            const msg = json.error?.message
            const code = json.error.code || ''

            opts?.log?.error({
              err: json,
              chunk,
              url: response.url,
              code,
              msg,
            })

            if (msg) {
              yield {
                error: `Provider responded with an error: ${msg}${code ? ` [${code}]` : ''}`,
                errorObj: json,
              }
              return
            }
          } else {
            const reasoning = getChoiceProp(json, 'reasoning') || getChoiceProp(json, 'thought')
            const token: string =
              getChoiceProp(json, 'content') || getChoiceProp(json, 'text') || json.response

            const index = +(getChoiceProp<string>(json, 'index') || '0')

            if (reasoning !== undefined) {
              let prefix = ''
              if (!thoughts) prefix += '<think>'
              thoughts += prefix + reasoning
              yield { token: prefix + reasoning }
            }

            if (token !== undefined) {
              if (index > 0) {
                if (!gens[index]) gens[index] = ''
                gens[index] += token
              } else {
                if (DEBUG) {
                  console.log(`[fetch] token: ${token}`)
                }
                // When we flip from reasoning to the response, we want to append a closing think tag
                let suffix = ''
                if (thoughts && !accum) {
                  suffix = '</think>'
                  thoughts += suffix
                }

                accum += token
                yield { token: suffix + token, index }
              }
            }

            const meta: any = {}

            getChoiceProp(json, 'model', meta)
            getChoiceProp(json, 'finish_reason', meta)

            yield { meta }
          }
        } else {
          opts?.log?.info({ chunk }, `[${format || 'fetch'}] cannot parse chunk`)
        }

        try {
          buffer = match.next
          match = processBuffer(buffer)
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

const marker = /data: /
const terminator = /\n\n|\r\r|\r\n\r\n/

function processBuffer(buffer: string) {
  const start = buffer.search(marker)
  if (start < 0) return

  let sub = buffer.slice(start)

  const end = sub.search(terminator)
  if (end < 0) return

  const match = sub.slice(0, end).replace('data: ', '').trim()
  const next = sub.slice(end).trimStart()

  return { match, next }
}

// function testBuffer() {
//   let buffer = ``

//   while (true) {
//     const match = processBuffer(buffer)
//     if (!match) break

//     console.log(match.match)
//     buffer = match.next
//   }
// }
// testBuffer()

function getChoiceProp<T = any>(json: any, prop: string, assign?: any) {
  const choice = json?.choices?.[0]
  const value = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]

  if (assign && value) {
    assign[prop] = value
  }

  return value as T
}

function tryParse(value: any) {
  try {
    const obj = JSON.parse(value)
    return obj
  } catch (ex) {
    return {}
  }
}
