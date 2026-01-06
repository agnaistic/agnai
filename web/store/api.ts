import Cookies from 'js-cookie'
import { EVENTS, events } from '../emitter'
import { jwtDecode } from 'jwt-decode'
import needle from 'needle'
import { parseSearchQuery, tryParse, incompleteJson, parseEvent } from '/common/util'
import { debug } from '/common/debug'
import { TickHandler } from '/common/prompt'
import { getNextThoughts, getNextTokens, joinThoughtTokens, joinUrl } from '/common/requests/util'

let socketId = ''

export function setSocketId(id: string) {
  socketId = id
}

const PROTO = location.protocol
const HOST = location.hostname.toLowerCase()
const PORT = location.port

// Sometimes a user has DNS issues with a particular API url.
// We can provide them a `?api_url=...` url to try alternate API urls
if (location.search) {
  const search = parseSearchQuery(location.search)
  if (search.api_url && search.api_url.endsWith('.agnai.chat')) {
    localStorage.setItem('api_url', search.api_url)
  }
}

const API_OVERRIDE = localStorage.getItem('api_url')

export const baseUrl = API_OVERRIDE
  ? `${PROTO}//${API_OVERRIDE}`
  : PORT === '1234' || PORT === '3001' // || HOST === 'localhost' || HOST === '127.0.0.1'
  ? `${PROTO}//${HOST}:3001`
  : HOST === 'agnai.chat'
  ? `${PROTO}//prd-api.agnai.chat`
  : HOST === 'prd-assets.agnai.chat'
  ? `${PROTO}//edge-api.agnai.chat`
  : HOST === 'dev.agnai.chat' || HOST === 'dev-assets.agnai.chat'
  ? `${PROTO}//edge-api.agnai.chat`
  : HOST === 'stg.agnai.chat'
  ? `${PROTO}//stg-api.agnai.chat`
  : location.origin

export const api = {
  get,
  post,
  method,
  upload,
  streamGet,
  streamPost,
  toApiUrl,
  fetchSSE,
  localSSE,
  isCdnApi,
  getFallbackApiUrl,
}

type Query = { [key: string]: string | number | undefined | boolean }

function getFallbackApiUrl() {
  if (baseUrl.includes('prd-api.agnai.chat')) {
    return 'api.agnai.chat'
  }

  if (baseUrl.includes('/api.agnai.chat')) {
    return 'edge-api.agnai.chat'
  }
}

function isCdnApi() {
  return baseUrl.includes('edge-api.agnai.chat')
}

async function method<T = any>(
  method: 'get' | 'post' | 'delete' | 'put',
  path: string,
  body = {},
  opts?: RequestInit & { noAuth?: boolean }
) {
  if (method === 'get') {
    return get<T>(path, body)
  }

  return callApi<T>(path, {
    method,
    ...opts,
    body: JSON.stringify(body),
  })
}

async function get<T = any>(path: string, query: Query = {}) {
  const params = Object.keys(query)
    .map((key) => `${key}=${query[key]}`)
    .join('&')

  const infix = path.includes('?') ? '&' : '?'
  let url = params ? `${path}${infix}${params}` : path

  return callApi<T>(url, {
    method: 'get',
  })
}

async function post<T = any>(path: string, body = {}) {
  return callApi<T>(path, {
    method: 'post',
    body: JSON.stringify(body),
  })
}

async function upload<T = any>(path: string, form: FormData) {
  const result = await callApi<T>(path, {
    method: 'post',
    body: form,
    headers: {
      Authorization: `Bearer ${getAuth()}`,
    },
  })
  return result
}

async function streamGet<T = any>(path: string, query: Query) {
  const params = Object.keys(query)
    .map((key) => `${key}=${query[key]}`)
    .join('&')

  return callApiStream<T>(`${path}?${params}`, { method: 'get' })
}

async function streamPost<T = any>(path: string, body: any) {
  return callApiStream<T>(path, {
    method: 'post',
    body: JSON.stringify(body),
  })
}

function toApiUrl(path: string) {
  const prefix = path.startsWith('/') ? '/api' : '/api'
  const fullUrl = path.startsWith('http') ? path : `${baseUrl}${prefix}${path}`
  return fullUrl
}

async function callApi<T = any>(
  path: string,
  opts: RequestInit & { noAuth?: boolean }
): Promise<{ result: T | undefined; status: number; error?: string }> {
  const prefix = path.startsWith('/') ? '/api' : '/api'
  const fullUrl = path.startsWith('http') ? path : `${baseUrl}${prefix}${path}`
  const res = await fetch(fullUrl, {
    ...headers(opts?.noAuth),
    ...opts,
  }).catch((err) => ({ error: err }))

  if ('error' in res) {
    if (isSessionExpired() && fullUrl.includes(baseUrl)) {
      events.emit(EVENTS.sessionExpired)
      return {
        result: undefined,
        status: 401,
        error: 'Your session has expired. Please login again.',
      }
    }

    return { result: undefined, status: 503, error: res.error.message || res.error }
  }

  const json = await res.json()

  const msg = json?.message || ''
  if (json.user_banned === true) {
    events.emit(EVENTS.userBanned, msg)
    return { result: undefined, status: res.status, error: msg }
  }

  if (res.status === 401 && fullUrl.includes(baseUrl)) {
    events.emit(EVENTS.sessionExpired)
    return {
      result: undefined,
      status: 401,
      error: 'Your session has expired. Please login again.',
    }
  }

  if (res.status >= 400) {
    return { result: undefined, status: res.status, error: json.message || res.statusText }
  }

  return { result: json, status: res.status, error: res.status >= 400 ? res.statusText : undefined }
}

type SSEOpts<T = {}> = T & {
  path: string
  headers: any
  body: any
  signal?: AbortController
  onData?: (event: any) => void
  onDone?: () => void
  onError?: (err: any) => void
  onTick?: TickHandler
}

export function localSSE(opts: SSEOpts<{ host: string }>) {
  const resp = needle.post(joinUrl(opts.host, opts.path), JSON.stringify(opts.body), {
    parse: false,
    signal: opts.signal?.signal,

    headers: {
      ...opts.headers,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
  })

  let accum = ''
  let error = ''
  let incomplete = ''
  let thoughts = ''
  let meta: any = {}
  let done = false

  handleNonData(
    opts,
    resp,
    (err) => {
      error = err
    },
    () => {
      if (done) return
      done = true
      opts.onTick?.(joinThoughtTokens(accum, thoughts), 'done')
      opts.onDone?.()
    }
  )

  resp.on('done', () => {
    if (done) return
    opts.onTick?.(joinThoughtTokens(accum, thoughts), 'done')
    opts.onDone?.()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = incomplete + chunk.toString()
    incomplete = ''

    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l && l !== ': OPENROUTER PROCESSING')

    for (const msg of messages) {
      // If we have an error, we want to retrieve the reason for the error
      // which is usually a message in the event stream
      if (error) {
        handleError(opts, error, msg)
        return
      }

      const { json, incomplete: skip } = preHandleData(opts, msg)
      if (skip) {
        incomplete = skip
        continue
      }

      if (!json || !opts.onTick) continue
      opts.onData?.(json)

      const changed = getChoiceProp(json, meta, ['model', 'finish_reason', 'provider'])
      if (changed.found) {
        opts.onTick('', 'meta', meta)
      }

      const thought = getNextThoughts(json)
      const token = getNextTokens(json) || json?.token || json?.response

      if (thought) {
        opts.onTick?.(thought, 'thought')
        thoughts += thought
      }

      if (token) {
        accum += token
        opts.onTick?.(accum, 'partial')
        continue
      }

      if (done) continue
      if (changed.matches.finish_reason) {
        opts?.onTick(joinThoughtTokens(accum, thoughts), 'done')
        done = true
        continue
      }

      const response = json.response
      if (response) {
        opts?.onTick(joinThoughtTokens(accum, thoughts), 'done')
        done = true
        continue
      }
    }
  })
}

function getChoiceProp<T = any>(json: any, assign: any, props: string[]) {
  let found = false
  let matches: any = {}

  for (const prop of props) {
    const choice = json?.choices?.[0]
    const value = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]

    if (assign && value) {
      if (assign[prop] === value) continue
      matches[prop] = value
      assign[prop] = value
      found = true
    }
  }

  return { found, matches }
}

// function getToken(json: any) {
//   const choice = json?.choices?.[0]
//   if (!choice) return

//   const token = choice.delta?.content || choice.delta?.text || choice.content || choice.text
//   return token
// }

export function fetchSSE(opts: SSEOpts) {
  const { path, headers, body, signal } = opts
  let resp = needle.post(api.toApiUrl(path), JSON.stringify(body), {
    parse: false,
    signal: signal?.signal,

    headers: {
      ...headers,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
  })

  let request = (resp as any).request as any

  let error = ''
  let incomplete = ''
  let accum = ''
  let thoughts = ''
  let done = false

  handleNonData(
    opts,
    resp,
    (err) => {
      error = err
    },
    () => {
      if (done) return
      done = true
      opts.onTick?.(joinThoughtTokens(accum, thoughts), 'done')
      opts.onDone?.()
      request.destroy()
    }
  )

  resp.on('done', () => {
    if (done) return
    done = true
    opts.onTick?.(joinThoughtTokens(accum, thoughts), 'done')
    opts.onDone?.()
    request.destroy()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = incomplete + chunk.toString()
    incomplete = ''

    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l && l !== ': OPENROUTER PROCESSING')

    for (const msg of messages) {
      // If we have an error, we want to retrieve the reason for the error
      // which is usually a message in the event stream
      if (error) {
        handleError(opts, error, msg)
        return
      }

      const { json, incomplete: skip } = preHandleData(opts, msg)
      if (skip) {
        incomplete = skip
        continue
      }

      if (!json) return

      if (json.error && !json.type) {
        opts.onTick?.(`Request failed: ` + json.error, 'error')
      }

      switch (json.type) {
        case 'message-partial':
        case 'inference-partial':
          accum = json.partial
          opts.onTick?.(json.partial, 'partial')
          break

        case 'message-error':
        case 'inference-error':
          opts.onTick?.(json.error, 'error')
          request.destroy()
          break

        case 'message-warning':
        case 'inference-warning':
          opts.onTick?.(json.warning, 'warning')
          break

        case 'message-created':
          opts.onTick?.(json.msg.msg, 'done')
          break

        case 'message-retry':
          opts.onTick?.(json.message, 'done')
          break

        case 'chat-json':
        case 'chat-query':
        case 'inference':
          done = true
          opts.onTick?.(joinThoughtTokens(json.response || accum, thoughts), 'done')
          opts.onDone?.()
          request.destroy()
          break

        case 'chat-summary':
          opts.onTick?.(json.summary, 'done')
          break

        case 'inference-thought':
          opts.onTick?.(json.thoughts, 'thought')
          thoughts += json.thoughts
          break

        case 'inference-meta':
        case 'message-meta':
          opts.onTick?.('', 'meta', json.meta)
          break
      }
    }
  })
}

function preHandleData(opts: SSEOpts, msg: string) {
  const event: any = parseEvent(msg)

  if (!event.data) {
    return { incomplete: undefined, event: undefined, json: undefined }
  }

  const data: string = event.data
  if (typeof data === 'string' && incompleteJson(data)) {
    return { incomplete: msg, event: undefined, json: undefined }
  }

  if (event.event) {
    event.type = event.event
  }

  const json = tryParse(event.data)

  if (json) {
    opts.onData?.(json)
  }

  return { event, json, incomplete: undefined }
}

function handleNonData(
  opts: SSEOpts,
  resp: NodeJS.ReadableStream,
  onError: (error: string) => void,
  onAbort: () => void
) {
  resp.on('header', (statusCode, headers) => {
    debug('sse')('code %s', statusCode)
    // const contentType = headers['content-type'] || ''
    if (statusCode > 201) {
      onError(`Streaming request failed with status code ${statusCode}`)
      // We need to return, most callers resolve successfully if we make the headers called.
      return
    }
    opts.onTick?.(`${statusCode}`, 'headers')
  })

  resp.on('err', (err) => {
    let error = `Streaming request failed: ${err?.message || err}`

    if (err?.name === 'AbortError' || err?.message?.startsWith('Aborted by signal')) {
      onAbort()
      return
    }

    onError(error)
    opts.onError?.(error)
    opts.onTick?.(error, 'error')
  })

  resp.on('timeout', (...args) => {
    let error = 'Network request failed'
    onError(error)
    opts.onError?.(error)
    opts.onTick?.(error, 'error')
  })
}

function handleError(opts: SSEOpts, error: string, msg: string) {
  const event = tryParse(msg)

  if (!event) {
    debug('error')(`!event: ${msg}`)
    opts.onError?.(error)
    opts.onTick?.(error, 'error')
  } else if (typeof event === 'string') {
    opts.onError?.(`Local request failed: ${event}`)
    opts.onTick?.(event, 'error')
  } else if (event.error) {
    if (typeof event.error === 'string') {
      opts.onError?.(`Local request failed: ${event.error}`)
      opts.onTick?.(event.error, 'error')
    } else if (event.error?.message) {
      opts.onError?.(`Local request failed: ${event.error.message}`)
      opts.onTick?.(event.error.message, 'error')
    }
  } else {
    opts.onError?.(error)
    opts.onTick?.(error, 'error')
  }
}

export function getAuthHeaders() {
  const jwt = getAuth()

  const headers: any = { 'Socket-ID': socketId }

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`
  }

  return headers
}

function headers(noAuth?: boolean) {
  const jwt = getAuth()
  const headers: any = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Socket-ID': socketId,
  }

  if (!noAuth && jwt) {
    headers.Authorization = `Bearer ${jwt}`
  }

  return { headers }
}

async function* callApiStream<T = any>(path: string, opts: RequestInit) {
  const prefix = path.startsWith('/') ? '/api' : '/api'
  const stream = await fetch(`${baseUrl}${prefix}${path}`, {
    ...opts,
    ...headers(),
  }).then((res) => res.body)

  if (!stream) {
    return
  }

  const reader = stream.getReader()
  let done = false
  do {
    const result = await reader.read()
    let done = result.done
    if (done) return
    if (!result.value) {
      yield
      continue
    }

    const buffer = Buffer.from(result.value)
    const str = buffer.toString()
    const responses = str.split('\n\n')
    for (const value of responses) {
      try {
        const json = JSON.parse(value)
        yield json
      } catch (ex) {
        yield value
      }
    }
  } while (!done)
}

export function setAuth(jwt: string) {
  Cookies.set('auth', jwt, { sameSite: 'strict', expires: 120 })
}

function isSessionExpired() {
  const jwt = getAuth()

  // No jwt = no session
  if (!jwt) return false

  const token = getTokenBody(jwt)
  const expiry = new Date(token.exp * 1000)

  return Date.now() > expiry.valueOf()
}

export function getAuth() {
  return Cookies.get('auth')
}

export function clearAuth() {
  Cookies.remove('auth')
}

export function isLoggedIn() {
  return !!getAuth()
}

export function getUserId() {
  const auth = getAuth()
  if (!auth) return 'anon'

  const data = getTokenBody(auth)
  return data?.userId
}

function getTokenBody(jwt: string) {
  const data = jwtDecode(jwt)
  return data as { admin: boolean; exp: number; iat: number; userId: string; username: string }
}

export function setAltAuth(jwt: string) {
  const prev = Cookies.get('auth')
  if (!prev) {
    return new Error(`Could not get previous auth`)
  }

  Cookies.set('original-auth', prev, { sameSite: 'strict', expires: 30 })
  Cookies.set('auth', jwt, { sameSite: 'strict', expires: 30 })
  location.href = `${location.origin}/settings?tab=3`
}

export function revertAuth() {
  const prev = Cookies.get('original-auth')
  if (!prev) {
    return new Error(`Could not get previous auth`)
  }

  setAuth(prev)
  Cookies.remove('original-auth')
  location.href = `${location.origin}/admin/users`
}

export function isImpersonating() {
  const prev = Cookies.get('original-auth')
  return !!prev
}
