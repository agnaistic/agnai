import needle from 'needle'

type PostReq = {
  host?: string
  url: string
  apikey?: string
  body: any
}

const baseUrl = `https://stablehorde.net/api/v2`

export const PY_URL = 'http://localhost:5001'

export async function post<T = any>({ url, apikey, body, ...opts }: PostReq): Result<T> {
  const headers: any = {}
  if (apikey) {
    headers.apikey = apikey
  }
  const res = await needle('post', `${opts.host || baseUrl}${url}`, body, {
    json: true,
    headers,
  }).catch((error) => ({ error }))

  if ('error' in res) {
    const error = new Error(`Could not reach server: ${res.error.message}`)
    return { error }
  }

  if (res.statusCode && res.statusCode >= 400) {
    const error = new RequestError(res)
    return { error }
  }

  return { result: res.body as T }
}

export async function get<T = any>({ url, apikey, ...opts }: Omit<PostReq, 'body'>): Result<T> {
  const headers: any = { 'Bypass-Tunnel-Reminder': 'true' }
  if (apikey) {
    headers.apikey = apikey
  }

  const res = await needle('get', `${opts.host || baseUrl}${url}`, { json: true, headers }).catch(
    (error) => ({
      error,
    })
  )

  if ('error' in res) {
    const error = new Error(`Could not reach server: ${res.error.message}`)
    return { error }
  }

  if (res.statusCode && res.statusCode >= 400) {
    const error = new RequestError(res)
    return { error }
  }

  return { result: res.body as T }
}

type Result<T = any> = Promise<{
  result?: T
  error?: Error
}>

export class RequestError extends Error {
  constructor(res: needle.NeedleResponse) {
    super(`${res.statusCode} ${res.statusMessage}`)
    this.body = res.body
  }
  body: any
}
