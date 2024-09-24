declare module 'libsodium-wrappers-sumo' {
  const mod: any

  export = mod
}

declare module 'png-chunk-text' {
  export function decode<T = { keyword: string; text: string }>(chunk: any): T
  export function encode<T = { name: string; data: any }>(key: string, value: string): T
}

declare module 'png-chunks-encode' {
  function encode(chunks: any): any
  export default encode
}

declare module 'png-chunks-extract' {
  function extract(buf: Buffer): Array<{ name: string; data: any }>

  export default extract
}

declare module '*.json' {
  const mod: any
  export default mod
}
