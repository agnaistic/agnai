import needle from 'needle'

type PostReq = {
  url: string
  apikey?: string
  body: any
}

const DEFAULT_API_KEY = '0000000000'

const baseUrl = `https://stablehorde.net/api/v2`

export async function post<T = any>({ url, apikey, body }: PostReq) {
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

export async function get<T = any>({ url, apikey }: Omit<PostReq, 'body'>) {
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
