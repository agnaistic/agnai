import { embedApi } from '/web/store/embeddings'

export type TokenCounter = (text: string) => number | Promise<number>

export type Encoder = {
  count: (text: string) => number
  encode: (text: string) => number[]
  decode: (tokens: number[]) => string
}

export type Tokenizer = {
  decode: (tokens: Int32Array) => string
  encode: (value: string) => Int32Array
}

export async function encode(text: string) {
  return embedApi.encode(text)
}

export async function decode(tokens: number[]) {
  return embedApi.decode(tokens)
}

export async function tokenize(text: string) {
  const tokens = await embedApi.encode(text)
  return tokens.length
}

export async function getEncoder() {
  return (text: string) => embedApi.encode(text).then((res) => res.length)
}
