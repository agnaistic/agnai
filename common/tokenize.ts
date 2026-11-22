import { debug } from './debug'
import { AsyncEncoder } from './types'
// @ts-ignore
import { embedApi } from '/web/store/embeddings'
import type * as HF from '@huggingface/transformers'

export type EncoderType =
  | 'novel'
  | 'novel-modern'
  | 'llama'
  | 'llama3'
  | 'claude'
  | 'turbo'
  | 'mistral'
  | 'yi'
  | 'cohere'
  | 'qwen2'
  | 'qwen3'
  | 'gemma'
  | 'glm'
  | 'deepseek'

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
  glm: 'zai-org/GLM-5.3',
  deepseek: 'deepseek-ai/DeepSeek-V4-Pro',
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
}

export async function countTokens(text: string) {
  const tokens = await encode(text)
  return tokens.length
}

export async function prepareTokenizer(encoder: string) {
  debug('xformers')('preparing tokenizer: %s', encoder)
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

  const test = tokenizer.encode('test')
  debug('xformers')('tokenizer prepared: %s | test: %s', encoder, test.join(','))
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
