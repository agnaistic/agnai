// @ts-ignore
import { embedApi } from '/web/store/embeddings'

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
  return (text: string) => embedApi.encode(text).then((res: number[]) => res.length)
}

export async function countTokens(text: string) {
  const tokens = await encode(text)
  return tokens.length
}
