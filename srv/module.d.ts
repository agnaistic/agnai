declare module '@agnai/sentencepiece-js' {
  export function cleanText(text: string): string

  export class SentencePieceProcessor {
    async load(modelPath: string): Promise<any>
    encodeIds(text: string): number[]
    decodeIds(tokens: number[]): string
    encodePieices(text: ReturnType<typeof cleanText>): string
  }
}

declare module '*.js' {
  const mod: any = {}

  export = mod
}
