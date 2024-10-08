import { SentencePieceProcessor } from '@agnai/sentencepiece-js'
import * as mlc from '@agnai/web-tokenizers'
import fs, { readFileSync } from 'fs'
import { init } from '@dqbd/tiktoken/lite/init'
import { encoding_for_model } from '@dqbd/tiktoken'
import { AIAdapter, NOVEL_MODELS, OPENAI_MODELS } from '../common/adapters'
import { resolve } from 'path'
import * as nai from 'nai-js-tokenizer'
import { logger } from './middleware'
import { AppSchema, Encoder, TokenCounter, Tokenizer } from '/common/types'

const claudeJson = readFileSync(resolve(__dirname, 'sp-models', 'claude.json'))
const pileJson = readFileSync(resolve(__dirname, 'sp-models', 'pile_tokenizer.json'))
const gpt2Json = readFileSync(resolve(__dirname, 'sp-models', 'gpt2_tokenizer.json'))
const cohereJson = readFileSync(resolve(__dirname, 'sp-models', 'cohere.json'))
const qwen2Json = readFileSync(resolve(__dirname, 'sp-models', 'qwen2.json'))
const llama3Json = readFileSync(resolve(__dirname, 'sp-models', 'llama3.json'))

let claudeEncoder: Tokenizer
let cohereEncoder: Tokenizer
let qwen2Encoder: Tokenizer
let llama3Encoder: Tokenizer
let krake: Encoder
let euterpe: Encoder
let gemma: Encoder

const davinciEncoder = encoding_for_model('text-davinci-003')
const turboEncoder = encoding_for_model('gpt-3.5-turbo')

const wasm = getWasm()

let novel: Encoder
let novelModern: Encoder
let llama: Encoder
let claude: Encoder
let davinci: Encoder
let turbo: Encoder
let mistral: Encoder
let yi: Encoder
let cohere: Encoder
let llama3: Encoder
let qwen2: Encoder

const main: Encoder = {
  encode: (value: string) => Array.from(turboEncoder.encode(value)),
  decode: (tokens) => turboEncoder.decode(Uint32Array.from(tokens)).toString(),
  count: (value: string) => turboEncoder.encode(value).length,
}

export type EncoderType =
  | 'novel'
  | 'novel-modern'
  | 'llama'
  | 'llama3'
  | 'claude'
  | 'davinci'
  | 'turbo'
  | 'mistral'
  | 'yi'
  | 'cohere'
  | 'qwen2'
  | 'gemma'

const TURBO_MODELS = new Set<string>([
  OPENAI_MODELS.Turbo,
  OPENAI_MODELS.Turbo0301,
  OPENAI_MODELS.Turbo0613,
  OPENAI_MODELS.Turbo_16k,
  OPENAI_MODELS.Turbo_Instruct,
  OPENAI_MODELS.Turbo_Intruct914,
])

export function getTokenCounter(
  adapter: AIAdapter | 'main',
  model: string | undefined,
  sub?: AppSchema.SubscriptionModel
): TokenCounter {
  if (sub?.tokenizer) {
    const tokenizer = getEncoderByName(sub.tokenizer as EncoderType)
    if (tokenizer) return tokenizer.count
  }
  const tokenizer = getEncoder(adapter, model)
  return tokenizer.count
}

export function getEncoderByName(type: EncoderType) {
  switch (type) {
    case 'mistral':
      return mistral

    case 'yi':
      return yi

    case 'claude':
      return claude

    case 'davinci':
      return davinci

    case 'llama':
      return llama

    case 'novel':
      return novel

    case 'novel-modern':
      return novelModern

    case 'turbo':
      return turbo

    case 'cohere':
      return cohere

    case 'qwen2':
      return qwen2

    case 'gemma':
      return gemma

    case 'llama3':
    default:
      return llama3
  }
}

export function getEncoder(adapter: AIAdapter | 'main', model?: string): Encoder {
  if (
    adapter === 'agnaistic' ||
    adapter === 'replicate' ||
    adapter === 'ooba' ||
    adapter === 'kobold' ||
    adapter === 'horde' ||
    adapter === 'goose' ||
    adapter === 'mancer'
  ) {
    return llama
  }

  if (adapter === 'claude') return claude ?? main

  if (adapter === 'novel') {
    if (model === NOVEL_MODELS['llama-3-erato-v1']) return llama3
    if (model === NOVEL_MODELS.kayra_v1) return novelModern
    if (model === NOVEL_MODELS.clio_v1) return novel
    if (model === NOVEL_MODELS.krake) return krake
    return euterpe
  }

  if (model === OPENAI_MODELS.DaVinci) {
    return davinci ?? main
  }

  if (model && TURBO_MODELS.has(model)) {
    return turbo ?? main
  }

  return main
}

{
  const json = JSON.parse(gpt2Json.toString())
  const tokenizer = new nai.Encoder(json.vocab, json.merges, json.specialTokens, json.config)
  euterpe = {
    encode: (value) => {
      const tokens = tokenizer.encode(value)
      return tokens
    },
    decode: (tokens) => {
      return tokenizer.decode(tokens)
    },
    count: (value) => tokenizer.encode(value).length,
  }
}

{
  const json = JSON.parse(pileJson.toString())
  const tokenizer = new nai.Encoder(json.vocab, json.merges, json.specialTokens, json.config)
  krake = {
    encode: (value) => {
      const tokens = tokenizer.encode(value)
      return tokens
    },
    decode: (tokens) => {
      return tokenizer.decode(tokens)
    },
    count: (value) => tokenizer.encode(value).length,
  }
}

export async function prepareTokenizers() {
  try {
    novel = createEncoder('mistral.model')
    novel = createEncoder('novelai.model')
    novelModern = createEncoder('novelai_v2.model')
    llama = createEncoder('llama.model')
    yi = createEncoder('yi.model')
    gemma = createEncoder('gemma.model')

    await init((imports) => WebAssembly.instantiate(wasm!, imports))
    {
      davinci = {
        decode: (tokens) => davinciEncoder.decode(Uint32Array.from(tokens)).toString(),
        encode: (value) => {
          const tokens = Array.from(davinciEncoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = davinciEncoder.encode(value).length + 4
          return tokens
        },
      }
    }
    {
      turbo = {
        decode: (tokens) => turboEncoder.decode(Uint32Array.from(tokens)).toString(),
        encode: (value) => {
          const tokens = Array.from(turboEncoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = turboEncoder.encode(value).length + 6
          return tokens
        },
      }
    }
    {
      claudeEncoder = await mlc.Tokenizer.fromJSON(claudeJson)
      claude = {
        decode: (tokens) => claudeEncoder.decode(Int32Array.from(tokens)),
        encode: (value) => {
          const tokens = Array.from(claudeEncoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = claudeEncoder.encode(value)
          return tokens.length
        },
      }
    }
    {
      cohereEncoder = await mlc.Tokenizer.fromJSON(cohereJson)
      cohere = {
        decode: (tokens) => cohereEncoder.decode(Int32Array.from(tokens)),
        encode: (value) => {
          const tokens = Array.from(cohereEncoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = cohereEncoder.encode(value)
          return tokens.length
        },
      }
    }
    {
      llama3Encoder = await mlc.Tokenizer.fromJSON(llama3Json)
      llama3 = {
        decode: (tokens) => llama3Encoder.decode(Int32Array.from(tokens)),
        encode: (value) => {
          const tokens = Array.from(llama3Encoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = llama3Encoder.encode(value)
          return tokens.length
        },
      }
    }
    {
      qwen2Encoder = await mlc.Tokenizer.fromJSON(qwen2Json)
      qwen2 = {
        decode: (tokens) => qwen2Encoder.decode(Int32Array.from(tokens)),
        encode: (value) => {
          const tokens = Array.from(qwen2Encoder.encode(value))
          return tokens
        },
        count: (value) => {
          const tokens = qwen2Encoder.encode(value)
          return tokens.length
        },
      }
    }
  } catch (ex: any) {
    logger.warn(`Failed to load OAI tokenizers`)
    logger.warn(ex?.message || ex)
  }
}

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

function createEncoder(filename: string): Encoder {
  const tokenizer = new SentencePieceProcessor()
  tokenizer.load(resolve(__dirname, 'sp-models', filename))
  const encoder: Encoder = {
    decode: (tokens: number[]) => {
      return tokenizer.decodeIds(tokens)
    },
    encode: (value: string) => {
      // const cleaned = sp.cleanText(value)
      return tokenizer.encodeIds(value)
    },
    count: (value: string) => {
      // const cleaned = sp.cleanText(value)
      return tokenizer.encodeIds(value).length
    },
  }
  return encoder
}
