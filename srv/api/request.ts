import needle from 'needle'

type ApiType = 'horde' | 'kobold'

type PostReq = {
  type: ApiType
  url: string
  apikey?: string
  body: any
}

const DEFAULT_API_KEY = '0000000000'

const urls = {
  horde: `https://stablehorde.net/api/v2`,
  kobold: `https://koboldai.net/api/v2`,
}

export async function post<T = any>({ type, url, apikey, body }: PostReq) {
  const baseUrl = urls[type]
  const headers: any = {}
  if (apikey) {
    headers.apikey = apikey
  }
  const res = await needle('post', `${baseUrl}${url}`, body, { json: true, headers })
  if (res.statusCode && res.statusCode >= 400) {
    const error: any = new Error(`${res.statusMessage}: ${res.statusCode}`)
    error.body = res.body
    throw error
  }

  return res.body as T
}

export async function get<T = any>({ type, url, apikey }: Omit<PostReq, 'body'>) {
  const baseUrl = urls[type]
  const headers: any = {}
  if (apikey) {
    headers.apikey = apikey
  }
  const res = await needle('get', `${baseUrl}${url}`, { json: true, headers })
  if (res.statusCode && res.statusCode >= 400) {
    const error: any = new Error(`${res.statusMessage}: ${res.statusCode}`)
    error.body = res.body
    throw error
  }

  return res.body as T
}
