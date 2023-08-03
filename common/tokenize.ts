export type TokenCounter = (text: string) => number

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
  const encoder = await import('gpt-3-encoder').then((mod) => mod.encode)
  return encoder(text)
}

export async function tokenize(text: string) {
  const encoder = await getEncoder()
  return encoder(text)
}

export async function decode(tokens: number[]) {
  const decoder = await getDecoder()
  return decoder(tokens)
}

export async function getEncoder() {
  const encoder = await import('gpt-3-encoder').then((mod) => mod.encode)
  return (text: string) => encoder(text).length
}

export async function getDecoder() {
  const decode = await import('gpt-3-encoder').then((mod) => mod.decode)
  return (tokens: number[]) => decode(tokens)
}
