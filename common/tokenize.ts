export type Encoder<B extends boolean = false> = (text: string, returnTokens?: B) => (B extends true ? number[] : number)

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
