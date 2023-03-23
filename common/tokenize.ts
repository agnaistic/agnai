import fs from 'fs'
import { init, Tiktoken } from '@dqbd/tiktoken/lite/init'
import { AIAdapter, NOVEL_MODELS, OPENAI_MODELS } from './adapters'
import gpt from 'gpt-3-encoder'

const cl100k_base = require('@dqbd/tiktoken/encoders/cl100k_base.json')
const p50k_base = require('@dqbd/tiktoken/encoders/p50k_base.json')

const wasm = fs.readFileSync('./node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm')

export type Encoder = (value: string) => number

const main: Encoder = function main(value: string) {
  return gpt.encode(value).length
}

const krake: Encoder = function krake(value: string) {
  return gpt.encode(value).length + 6
}

let davinci: Encoder
let turbo: Encoder

export function getEncoder(adapter: AIAdapter, model?: string) {
  if (adapter !== 'openai' && adapter !== 'novel') return main

  if (model === NOVEL_MODELS.krake) {
    return krake
  }

  if (model === OPENAI_MODELS.DaVinci) {
    return davinci ?? krake
  }

  if (model === OPENAI_MODELS.Turbo) {
    return turbo ?? krake
  }

  return main
}

async function prepareTokenizers() {
  try {
    await init((imports) => WebAssembly.instantiate(wasm, imports))

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
        const tokens = encoder.encode(value).length + 4
        return tokens
      }
    }
  } catch (ex) {
    console.warn(`Failed to load OAI tokenizers`)
    console.warn(ex)
  }
}

prepareTokenizers()

function dialogTrim(value: string, dialog: boolean) {
  if (!dialog) return value
  return value.substring(value.indexOf(':') + 1).trim()
}
