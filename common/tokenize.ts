import fs from 'fs'
import { init, Tiktoken } from '@dqbd/tiktoken/lite/init'
import { AIAdapter, OPENAI_MODELS } from './adapters'
import gpt from 'gpt-3-encoder'
const cl100k_base = require('@dqbd/tiktoken/encoders/cl100k_base.json')
const p50k_base = require('@dqbd/tiktoken/encoders/p50k_base.json')

const wasm = fs.readFileSync('./node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm')

type Encoder = (value: string) => number[] | Uint32Array

let davinci: Encoder
let turbo: Encoder

export function getEncoder(adapter: AIAdapter, model?: string) {
  if (adapter !== 'openai') return gpt.encode

  if (model === OPENAI_MODELS.DaVinci) {
    return davinci ?? gpt.encode
  }

  if (model === OPENAI_MODELS.Turbo) {
    return turbo ?? gpt.encode
  }

  return gpt.encode
}

async function prepareTokenizers() {
  try {
    await init((imports) => WebAssembly.instantiate(wasm, imports))

    {
      const encoder = new Tiktoken(p50k_base.bpe_ranks, p50k_base.special_tokens, p50k_base.pat_str)
      davinci = encoder.encode.bind(encoder)
    }

    {
      const encoder = new Tiktoken(
        cl100k_base.bpe_ranks,
        cl100k_base.special_tokens,
        cl100k_base.pat_str
      )
      turbo = encoder.encode.bind(encoder)
    }
  } catch (ex) {}
}

prepareTokenizers()
