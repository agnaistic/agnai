import * as sp from 'sentencepiece-js'
import fs, { readFileSync } from 'fs'
import { init } from '@dqbd/tiktoken/lite/init'
import { encoding_for_model } from '@dqbd/tiktoken'
import { AIAdapter, NOVEL_MODELS, OPENAI_MODELS } from '../common/adapters'
import gpt from 'gpt-3-encoder'
import { resolve } from 'path'
import { Encoder, Tokenizer } from '../common/tokenize'
import * as mlc from '@mlc-ai/web-tokenizers'
const claudeJson = readFileSync(resolve(__dirname, 'sp-models', 'claude.json'))

const nerdstash = new sp.SentencePieceProcessor()
nerdstash.load(resolve(__dirname, './sp-models/novelai.model'))

const nerdstashV2 = new sp.SentencePieceProcessor()
nerdstashV2.load(resolve(__dirname, './sp-models/novelai_v2.model'))

const llamaModel = new sp.SentencePieceProcessor()
llamaModel.load(resolve(__dirname, './sp-models/llama.model'))

let claudeEncoder: Tokenizer
const davinciEncoder = encoding_for_model('text-davinci-003')
const turboEncoder = encoding_for_model('gpt-3.5-turbo')

const wasm = getWasm()

const main: Encoder = function main(value: string, returnTokens?: boolean) {
  const tokens = gpt.encode(value)
  return returnTokens ? tokens : tokens.length
} as Encoder

const novelNSV1: Encoder = function clio(value: string, returnTokens?: boolean) {
  const cleaned = returnTokens ? value : sp.cleanText(value)
  const tokens = nerdstash.encodeIds(cleaned)
  return returnTokens ? tokens : tokens.length
} as Encoder

const novelNSV2: Encoder = function kayra(value: string, returnTokens?: boolean) {
  const cleaned = returnTokens ? value : sp.cleanText(value)
  const tokens = nerdstashV2.encodeIds(cleaned)
  return returnTokens ? tokens : tokens.length
} as Encoder

const llama: Encoder = function llama(value: string, returnTokens?: boolean) {
  const cleaned = returnTokens ? value : sp.cleanText(value)
  const tokens = llamaModel.encodeIds(cleaned)
  return returnTokens ? tokens : (tokens.length + 4)
} as Encoder

let claude: Encoder
let davinci: Encoder
let turbo: Encoder

const TURBO_MODELS = new Set<string>([
  OPENAI_MODELS.Turbo,
  OPENAI_MODELS.Turbo0301,
  OPENAI_MODELS.Turbo0613,
  OPENAI_MODELS.Turbo_16k,
])

export function getEncoder(adapter: AIAdapter | 'main', model?: string) {
  if (adapter === 'replicate') {
    if (!model || model === 'llama') return llama
    return main
  }

  if (adapter === 'claude') return claude ?? main

  if (adapter !== 'openai' && adapter !== 'novel') return main

  if (adapter === 'novel') {
    if (model === NOVEL_MODELS.kayra_v1) return novelNSV2
    if (model === NOVEL_MODELS.clio_v1) return novelNSV1
    return main
  }

  if (model === OPENAI_MODELS.DaVinci) {
    return davinci ?? main
  }

  if (model && TURBO_MODELS.has(model)) {
    return turbo ?? main
  }

  return main
}

export function getEncoderTokens(adapter: AIAdapter | 'main', model?: string) {
  return getEncoder(adapter, model) as any as Encoder<true>
}

async function prepareTokenizers() {
  try {
    await init((imports) => WebAssembly.instantiate(wasm!, imports))

    {
      davinci = function(value, returnTokens?: boolean) {
        const tokens = davinciEncoder.encode(value)
        return returnTokens ? Array.from(tokens) : (tokens.length + 4)
      } as Encoder
    }

    {
      turbo = function(value, returnTokens?: boolean) {
        const tokens = turboEncoder.encode(value)
        return returnTokens ? Array.from(tokens) : (tokens.length + 6)
      } as Encoder
    }

    {
      claudeEncoder = await mlc.Tokenizer.fromJSON(claudeJson)
      claude = function(value, returnTokens?: boolean) {
        const tokens = turboEncoder.encode(value)
        return returnTokens ? Array.from(tokens) : tokens.length
      } as Encoder
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
