import * as UI from './ui'
import * as Sprite from './sprite'
import * as Memory from './memory'
import * as Saga from './saga'
import * as Admin from './admin'

export * from './schema'
export * from './texttospeech-schema'

export { UI, Sprite, Memory, Saga, Admin }

export type TokenCounter = (text: string) => number | Promise<number>

export type Encoder = {
  count: (text: string) => number
  encode: (text: string) => number[]
  decode: (tokens: number[]) => string
}

export type AsyncEncoder = {
  name?: string
  count: (text: string) => Promise<number>
  encode: (text: string) => Promise<number[]>
  decode: (tokens: number[]) => Promise<string>
}

export type Tokenizer = {
  decode: (tokens: Int32Array) => string
  encode: (value: string) => Int32Array
}
