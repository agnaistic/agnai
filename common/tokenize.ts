import { AsyncEncoder } from './types'
import { EncoderType } from '/srv/tokenize'
// @ts-ignore
import { embedApi } from '/web/store/embeddings'
import type * as HF from '@huggingface/transformers'

const DEFAULT_ENCODER: AsyncEncoder = {
  name: 'default',
  encode: embedApi.encode,
  decode: embedApi.decode,
  count: (text: string) => embedApi.encode(text).then((res: number[]) => res.length),
}

const encoderModels: { [encoder in EncoderType]?: string } = {
  llama3: 'Xenova/llama3-tokenizer',
  qwen3: 'Qwen/Qwen3-0.6B',
  qwen2: 'Qwen/Qwen2.5-0.5B-Instruct',
  claude: 'Xenova/claude-tokenizer',
  cohere: 'CohereLabs/command-a-plus-05-2026-fp8',
  gemma: 'google/gemma-4-E2B',
  llama: 'Xenova/llama3-tokenizer',
  mistral: 'mistralai/Mistral-Medium-3.5-128B',
  turbo: 'openai/gpt-oss-20b',
}

const encoders: Record<string, AsyncEncoder> = {}

let ACTIVE_TOKENIZER = ''

export async function encode(text: string) {
  return getActiveEncoder().encode(text)
}

export async function decode(tokens: number[]) {
  return getActiveEncoder().decode(tokens)
}

export async function tokenize(text: string) {
  const tokens = await getActiveEncoder().encode(text)
  return tokens.length
}

export async function getEncoder(encoder?: string) {
  return getActiveEncoder().count
  // if (!encoder) {
  //   return (text: string) => embedApi.encode(text).then((res: number[]) => res.length)
  // }

  // const match = encoders[encoder]
  // if (!match) return (text: string) => embedApi.encode(text).then((res: number[]) => res.length)

  // return match.count
}

export async function countTokens(text: string) {
  const tokens = await encode(text)
  return tokens.length
}

export async function prepareTokenizer(encoder: string) {
  ACTIVE_TOKENIZER = encoder

  if (encoders[encoder]) {
    return
  }

  if (!isValidEncoder(encoder)) return
  const model = encoderModels[encoder]
  if (!model) return

  // To prevent multiple loads of the same model, we will polyfill until the model becomes available
  encoders[encoder] = DEFAULT_ENCODER

  const HF = await hf()
  const tokenizer = await HF.AutoTokenizer.from_pretrained(model)

  encoders[encoder] = {
    name: encoder,
    encode: (text) => {
      const tokens = tokenizer.encode(text)
      return Promise.resolve(tokens)
    },
    decode: (tokens) => {
      const text = tokenizer.decode(tokens)
      return Promise.resolve(text)
    },
    count: (text) => {
      const tokens = tokenizer.encode(text)
      return Promise.resolve(tokens.length)
    },
  }

  console.log(`[encoder] ${encoder} ready`)
}

function isValidEncoder(encoder: string): encoder is EncoderType {
  return encoder in encoderModels === true
}

async function hf() {
  // We use the CDN version to avoid run-time errors relating to accessing the `import` object
  const lib = await dynamicImport('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1')
  lib.env.allowLocalModels = false
  return lib as typeof HF
}

const dynamicImport = new Function('a', 'return import(a);')

function getActiveEncoder() {
  return encoders[ACTIVE_TOKENIZER] || DEFAULT_ENCODER
}
