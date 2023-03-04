import needle from 'needle'

type PostReq = {
  baseUrl?: string
  url: string
  apikey?: string
  body: any
}

const DEFAULT_API_KEY = '0000000000'

const baseUrl = `https://stablehorde.net/api/v2`

export const PY_URL = 'http://localhost:5001'

export async function post<T = any>({ url, apikey, body, ...opts }: PostReq) {
  const headers: any = {}
  if (apikey) {
    headers.apikey = apikey
  }
  const res = await needle('post', `${opts.baseUrl || baseUrl}${url}`, body, {
    json: true,
    headers,
  })
  if (res.statusCode && res.statusCode >= 400) {
    const error: any = new Error(`${res.statusMessage}: ${res.statusCode}`)
    error.body = res.body
    throw error
  }

  return res.body as T
}

export async function get<T = any>({ url, apikey, ...opts }: Omit<PostReq, 'body'>) {
  const headers: any = {}
  if (apikey) {
    headers.apikey = apikey
  }
  const res = await needle('get', `${opts.baseUrl || baseUrl}${url}`, { json: true, headers })
  if (res.statusCode && res.statusCode >= 400) {
    const error: any = new Error(`${res.statusMessage}: ${res.statusCode}`)
    error.body = res.body
    throw error
  }

  return res.body as T
}
