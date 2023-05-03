import { AIAdapter, OPENAI_MODELS } from './adapters'
import gpt from 'gpt-3-encoder'

export type Encoder = (value: string) => number

const main: Encoder = function main(value: string) {
  return gpt.encode(value).length
}

const novel: Encoder = function krake(value: string) {
  return gpt.encode(value).length + 4
}

let davinci: Encoder
let turbo: Encoder

export function getEncoder(adapter: AIAdapter | 'main', model?: string) {
  if (adapter !== 'openai' && adapter !== 'novel') return main

  if (adapter === 'novel') {
    return novel
  }

  if (model === OPENAI_MODELS.DaVinci) {
    return davinci ?? novel
  }

  if (model === OPENAI_MODELS.Turbo) {
    return turbo ?? novel
  }

  return main
}
