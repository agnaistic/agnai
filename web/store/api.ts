import Cookies from 'js-cookie'
import { EVENTS, events } from '../emitter'
import { jwtDecode } from 'jwt-decode'

let socketId = ''

export function setSocketId(id: string) {
  socketId = id
}

const PROTO = location.protocol
const HOST = location.hostname.toLowerCase()
const PORT = location.port

const API_OVERRIDE = localStorage.getItem('api_url')

export const baseUrl = API_OVERRIDE
  ? `${PROTO}//${API_OVERRIDE}`
  : PORT === '1234' || PORT === '3001' || HOST === 'localhost' || HOST === '127.0.0.1'
  ? `${PROTO}//${HOST}:3001`
  : HOST === 'agnai.chat' || HOST === 'prd-assets.agnai.chat'
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
}

type Query = { [key: string]: string | number }

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
