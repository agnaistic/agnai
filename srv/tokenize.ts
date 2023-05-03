import fs from 'fs'
import { init, Tiktoken } from '@dqbd/tiktoken/lite/init'
import { AIAdapter, OPENAI_MODELS } from '../common/adapters'
import gpt from 'gpt-3-encoder'
import { resolve } from 'path'
import { Encoder } from '../common/tokenize'

const cl100k_base = require('@dqbd/tiktoken/encoders/cl100k_base.json')
const p50k_base = require('@dqbd/tiktoken/encoders/p50k_base.json')

const wasm = getWasm()

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

async function prepareTokenizers() {
  try {
    await init((imports) => WebAssembly.instantiate(wasm!, imports))

    {
      const encoder = new Tiktoken(p50k_base.bpe_ranks, p50k_base.special_tokens, p50k_base.pat_str)
      davinci = (value) => {
        const tokens = encoder.encode(value).length + 4
        return tokens
      }
    }

    {
      const encoder = new Tiktoken(
        cl100k_base.bpe_ranks,
        cl100k_base.special_tokens,
        cl100k_base.pat_str
      )

      turbo = (value) => {
        const tokens = encoder.encode(value).length + 5
        return tokens
      }
    }
  } catch (ex) {
    console.warn(`Failed to load OAI tokenizers`)
    console.warn(ex)
  }
}

prepareTokenizers()

function getWasm() {
  try {
    const wasm = fs.readFileSync('./node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm')
    return wasm
  } catch (ex) {}

  try {
    const path = resolve(__dirname, '..', 'node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm')
    const wasm = fs.readFileSync(path)
    return wasm
  } catch (ex) {}
}
