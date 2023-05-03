export type Encoder = (text: string) => number

export async function tokenize(text: string) {
  const encoder = await getEncoder()
  return encoder(text)
}

export async function getEncoder() {
  const encoder = await import('gpt-3-encoder').then((mod) => mod.encode)
  return (text: string) => encoder(text).length
}
