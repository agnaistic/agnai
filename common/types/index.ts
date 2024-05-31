import * as UI from './ui'
import * as Sprite from './sprite'
import * as Memory from './memory'
import * as Saga from './saga'

export * from './schema'
export * from './texttospeech-schema'

export { UI, Sprite, Memory, Saga }

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
