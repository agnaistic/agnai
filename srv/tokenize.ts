import * as sp from 'sentencepiece-js'
import fs, { readFileSync } from 'fs'
import { init } from '@dqbd/tiktoken/lite/init'
import { encoding_for_model } from '@dqbd/tiktoken'
import { AIAdapter, NOVEL_MODELS, OPENAI_MODELS } from '../common/adapters'
import gpt from 'gpt-3-encoder'
import { resolve } from 'path'
import { Encoder, TokenCounter, Tokenizer } from '../common/tokenize'
import * as mlc from '@mlc-ai/web-tokenizers'
import * as nai from 'nai-js-tokenizer'

const claudeJson = readFileSync(resolve(__dirname, 'sp-models', 'claude.json'))
const pileJson = readFileSync(resolve(__dirname, 'sp-models', 'pile_tokenizer.json'))
const gpt2Json = readFileSync(resolve(__dirname, 'sp-models', 'gpt2_tokenizer.json'))

const nerdstash = new sp.SentencePieceProcessor()
nerdstash.load(resolve(__dirname, './sp-models/novelai.model'))

const nerdstashV2 = new sp.SentencePieceProcessor()
nerdstashV2.load(resolve(__dirname, './sp-models/novelai_v2.model'))

const llamaModel = new sp.SentencePieceProcessor()
llamaModel.load(resolve(__dirname, './sp-models/llama.model'))

let claudeEncoder: Tokenizer
let krake: Encoder
let euterpe: Encoder

const davinciEncoder = encoding_for_model('text-davinci-003')
const turboEncoder = encoding_for_model('gpt-3.5-turbo')

const wasm = getWasm()

const main: Encoder = {
  encode: (value: string) => gpt.encode(value),
  decode: (tokens) => gpt.decode(tokens),
  count: (value: string) => gpt.encode(value).length,
}

const novel: Encoder = {
  decode: (tokens: number[]) => {
    return nerdstash.decodeIds(tokens)
  },
  encode: (value: string) => {
    // const cleaned = sp.cleanText(value)
    return nerdstash.encodeIds(value)
  },
  count: (value: string) => {
    // const cleaned = sp.cleanText(value)
    return nerdstash.encodeIds(value).length
  },
}

const novelModern: Encoder = {
  encode: (value: string) => {
    // const cleaned = sp.cleanText(value)
    return nerdstashV2.encodeIds(value)
  },
  decode: (tokens) => nerdstashV2.decodeIds(tokens),
  count: (value: string) => {
    // const cleaned = sp.cleanText(value)
    return nerdstashV2.encodeIds(value).length
  },
}

const llama: Encoder = {
  encode: (value: string) => {
    // const cleaned = sp.cleanText(value)
    return llamaModel.encodeIds(value)
  },
  decode: (tokens) => llamaModel.decodeIds(tokens),
  count: (value) => {
    // const cleaned = sp.cleanText(value)
    return llamaModel.encodeIds(value).length
  },
}

let claude: Encoder
let davinci: Encoder
let turbo: Encoder

const TURBO_MODELS = new Set<string>([
  OPENAI_MODELS.Turbo,
  OPENAI_MODELS.Turbo0301,
  OPENAI_MODELS.Turbo0613,
  OPENAI_MODELS.Turbo_16k,
])

export function getTokenCounter(adapter: AIAdapter | 'main', model?: string): TokenCounter {
  const tokenizer = getEncoder(adapter, model)
  return tokenizer.count
}

export function getEncoder(adapter: AIAdapter | 'main', model?: string): Encoder {
  if (adapter === 'replicate') {
    if (!model || model === 'llama') return llama
    return main
  }

  if (adapter === 'claude') return claude ?? main

  if (adapter !== 'openai' && adapter !== 'novel') return main

  if (adapter === 'novel') {
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

async function prepareTokenizers() {
  try {
    await init((imports) => WebAssembly.instantiate(wasm!, imports))

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
