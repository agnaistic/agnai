declare module 'png-chunk-text' {
  export function decode<T = { keyword: string; text: string }>(chunk: any): T
}

declare module 'png-chunks-extract' {
  function extract(buf: Buffer): Array<{ name: string; data: any }>

  export default extract
}
