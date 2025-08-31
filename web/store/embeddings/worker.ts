import * as lf from 'localforage'
import type * as HF from '@huggingface/transformers'
import {
  EmbedDocument,
  RequestChatEmbed,
  RequestDocEmbed,
  WorkerRequest,
  WorkerResponse,
} from './types'
import { docCache } from './cache'
import { getEncoding } from 'js-tiktoken'
import { AllTasks, TaskType } from '@huggingface/transformers'

const encoder = getEncoding('cl100k_base')
const DEVICE = undefined

// Absolutely awful workaround due to Parcel.js being extremely sucky
const dynamicImport = new Function('a', 'return import(a);')

type Vector = { data: number[] }

type TextEmbed = { msg: string; entityId: string; embed: Vector; meta: any }
type RankedMsg = { msg: string; entityId: string; similarity: number; meta: any }
// type Tensor = { data: number[]; dims: number[]; size: number; type: string }

type Embeddings = {
  [chatId: string]: { [msgId: string]: TextEmbed }
}

// let Tokenizer: PreTrainedTokenizer

const EMBED = {
  inited: false,
  model: '',
  pipeline: null as HF.FeatureExtractionPipeline | null,
}

const CAPTION = {
  inited: false,
  model: '',
  proc: null as HF.Processor | null,
  pipeline: null as HF.PreTrainedModel | null,
}

const embeddings: Embeddings = {}
const documents: Record<string, VectorizedDocument> = {}

type VectorizedDocument = Array<EmbedDocument & { embed: Vector }>

const handlers: {
  [key in WorkerRequest['type']]: (msg: Extract<WorkerRequest, { type: key }>) => Promise<void>
} = {
  encode: async (msg) => {
    const result = encoder.encode(msg.text)
    post('encoding', { id: msg.id, tokens: result })
  },
  decode: async (msg) => {
    const result = encoder.decode(msg.tokens)
    post('decoding', { id: msg.id, text: result })
  },
  initSimilarity: async (msg) => {
    if (!msg.model) {
      if (EMBED.inited) {
        console.log('[embed] unloaded')
      }

      EMBED.model = ''
      EMBED.pipeline = null
      EMBED.inited = false
      return
    }
    if (EMBED.inited && msg.model === EMBED.model) {
      console.log('[embed] already inited')
      return
    }

    if (!msg.model) return

    EMBED.inited = true
    EMBED.model = msg.model

    const embedder = await pipeline('feature-extraction', msg.model, (data) => {
      post('progress', data)
    })
    EMBED.pipeline = embedder

    console.log(`[embed] ready`)
    post('embedLoaded', {})
  },
  initCaptioning: async (msg) => {
    if (!msg.model && CAPTION.inited) {
      CAPTION.inited = false
      CAPTION.pipeline = null
      CAPTION.model = ''
      console.log('[caption] model unloaded')
      return
    }

    if (msg.model === CAPTION.model) return

    CAPTION.inited = true
    CAPTION.model = msg.model

    if (msg.model.startsWith('http')) {
      console.log('[caption] http captioner not supported', msg.model)
      return
    }

    console.log(`[caption] loading: ${msg.model} using device:${DEVICE}`)
    await initCaptioner(msg.model)

    console.log(`[caption] ready`)
    post('captionLoaded', {})
  },
  captionImage: async (msg) => {
    if (!CAPTION.inited || !CAPTION.pipeline || !CAPTION.proc) {
      console.log('[caption] no model loaded', CAPTION.inited, !!CAPTION.pipeline, !!CAPTION.proc)
      return
    }

    const base64 = msg.image.includes(',') ? msg.image.split(',')[1] : msg.image

    const api = await hf()
    const buffer = Buffer.from(base64, 'base64')
    const blob = new Blob([new Uint8Array(buffer)])
    const image = await hf().then((api) => api.RawImage.fromBlob(blob))

    const messages = [{ role: 'user', content: "<|image_1|>What's funny about this image?" }]

    const prompt = CAPTION.proc.tokenizer!.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
    })

    const inputs = await CAPTION.proc(prompt, image, { num_crops: 4 })

    console.log(`[caption] starting`)
    try {
      const streamer = new api.TextStreamer(CAPTION.proc.tokenizer!, {
        skip_prompt: true,
        skip_special_tokens: true,
      })
      // Generate response
      const output = await CAPTION.pipeline.generate({
        ...inputs,
        streamer,
        max_new_tokens: 512,
      })

      console.log(output)

      const result = await CAPTION.pipeline(image)
      const text = result[0].generated_text
      console.log(`[caption] done: ${text}`)
      post('caption', { requestId: msg.requestId, caption: text })
    } catch (ex) {
      console.log(`[caption] caption failed`)
      console.error(ex)
    }
  },
  embedChat: async (msg) => {
    if (!EMBED.inited) return
    if (!EMBED.pipeline) return
    if (!embeddings[msg.chatId]) {
      const cached = await reviveChatEmbeddings(msg.chatId)
      embeddings[msg.chatId] = cached
    }

    embed(msg)
  },
  deleteChatCache: async (msg) => {
    await deleteChatCache(msg.chatId)
  },
  embedDocument: async (msg) => {
    if (!documents[msg.documentId]) {
      documents[msg.documentId] = []
    }

    await docCache.saveDoc(msg.documentId, msg)
    embed(msg)
  },
  queryChat: async (query) => {
    if (!EMBED.pipeline) return
    if (!embeddings[query.chatId]) return
    const embed = await EMBED.pipeline(query.text, { pooling: 'mean', normalize: true })

    const path = new Set(query.path)

    const embeds = Object.values(embeddings[query.chatId])
      .filter((msg) => {
        if (!path.has(msg.meta.id)) return false
        const isBefore = !query.beforeDate ? true : msg.meta.created <= query.beforeDate
        return msg.msg !== query.text && isBefore
      })
      .map((msg) => {
        const similarity = calculateCosineSimilarity(embed.data as number[], msg.embed.data)
        return { msg: msg.msg, entityId: msg.entityId, similarity, meta: msg.meta }
      })
      .sort(rank)
    post('result', { messages: embeds, requestId: query.requestId })
  },
  query: async (query) => {
    if (!EMBED.pipeline) {
      post('result', { messages: [], requestId: query.requestId })
      return
    }

    const embed = await EMBED.pipeline(query.text, { pooling: 'mean', normalize: true })
    const start = Date.now()

    if (documents[query.chatId]) {
      const embeds = documents[query.chatId]
        .filter((msg) => msg.msg !== query.text)
        .map((msg) => {
          const similarity = calculateCosineSimilarity(embed.data as number[], msg.embed.data)
          return { msg: msg.msg, entityId: '', similarity, meta: msg.meta }
        })
        .sort(rank)
      post('result', { messages: embeds, requestId: query.requestId })
    }
    console.log(`[embed] ${Date.now() - start}ms`)
  },
}

onmessage = (event) => {
  const msg = event.data as WorkerRequest
  const handler = handlers[msg.type]
  if (handler) {
    handler(msg as any)
  }
}

function post<T extends WorkerResponse['type']>(
  type: T,
  payload: Omit<Extract<WorkerResponse, { type: T }>, 'type'>
) {
  self.postMessage({ type, ...payload })
}

function calculateCosineSimilarity(input: number[], compare: number[]) {
  let dotProduct = 0
  let queryMagnitude = 0
  let embeddingMagnitude = 0

  const compares = toVectorArray(compare)

  for (let i = 0; i < compares.length; i++) {
    dotProduct += compare[i] * input[i]
    queryMagnitude += compare[i] ** 2
    embeddingMagnitude += input[i] ** 2
  }
  const similarity = dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude))
  return similarity
}

function rank(left: RankedMsg, right: RankedMsg) {
  return right.similarity - left.similarity
}

post('init', {})

const embedQueue: Array<RequestChatEmbed | RequestDocEmbed> = []

let EMBEDDING = false
async function embed(msg: RequestChatEmbed | RequestDocEmbed) {
  if (!EMBED.inited || !EMBED.pipeline) return

  const type = msg.type === 'embedChat' ? 'chat' : 'document'
  const id = msg.type === 'embedChat' ? msg.chatId : msg.documentId
  if (EMBEDDING) {
    embedQueue.push(msg)
    post('status', { id, kind: type, status: 'queued' })
    console.log(`[${type}] ${id} queued`)
    return
  }

  EMBEDDING = true
  post('status', { id, kind: type, status: 'loading' })
  console.log(`[${type}] ${id} started`)
  const now = Date.now()
  if (msg.type === 'embedChat') {
    const seen = new Set<string>()
    const cache = embeddings[msg.chatId]

    console.log(`[${type}] cached: ${Object.keys(cache).length}`)

    const filtered = msg.messages.filter((msg) => {
      seen.add(msg._id)
      const prev = embeddings[msg.chatId][msg._id]
      if (!prev) return true
      if (prev.msg !== msg.msg) return true
      return false
    })

    for (const msg of filtered) {
      if (msg.adapter === 'image' || msg.ooc) continue
      const original = cache[msg._id]
      if (original && original.msg === msg.msg) continue

      try {
        const embedding = await vectorize(msg.msg)
        cache[msg._id] = {
          entityId: msg.characterId || msg.userId || '',
          msg: msg.msg,
          embed: embedding,
          meta: { id: msg._id, created: msg.createdAt },
        }
      } catch (ex: any) {
        console.log(`vectorized failed: ${ex?.message || ex}`)
      }
    }

    // let deleted = 0
    // for (const cachedId of Object.keys(cache)) {
    //   if (seen.has(cachedId)) continue
    //   delete cache[cachedId]
    //   deleted++
    // }

    console.log(`[${type}] done ${(Date.now() - now) / 1000}s`)
    await cacheChatEmbeddings(msg.chatId, cache)

    // const pre = deleted > 0 ? '+' : ''
    // console.log(`[chat] ${msg.chatId} embedded (${pre}${deleted})`)
  }

  if (msg.type === 'embedDocument') {
    let embedded = 0
    documents[msg.documentId] = await reviveDocumentEmbeddings(msg.documentId)

    const doc = documents[msg.documentId]
    const nextDoc: VectorizedDocument = []

    let pos = 0
    for (const item of msg.documents) {
      const exist = doc[pos]
      pos++

      if (exist && exist.msg === item.msg) {
        nextDoc[pos] = exist
        continue
      }

      const embed = await vectorize(item.msg)
      embedded++
      const percent = ((embedded / msg.documents.length) * 100).toFixed(1)
      post('status', { id, kind: type, status: `loading (${percent}%)` })
      nextDoc[pos] = { msg: item.msg, embed, meta: item.meta }
    }

    documents[msg.documentId] = nextDoc
    await cacheDocumentEmbeddings(msg.documentId, nextDoc)
    console.log(`[document] ${msg.documentId} embedded`)
  }

  post('status', { id, kind: type, status: 'loaded' })
  EMBEDDING = false

  const next = embedQueue.shift()
  if (next) {
    await new Promise((res) => setTimeout(res, 50))
    embed(next)
  }
}

async function vectorize(msg: string) {
  console.log(`vectorizing ${msg.length} chars`)
  const embed = await EMBED.pipeline!(msg, { pooling: 'mean', normalize: true })
  console.log('vectorized')
  return { data: embed.data as number[] }
}

async function cacheDocumentEmbeddings(docId: string, embeddings: VectorizedDocument) {
  await lf.setItem(`document-embeddings-${docId}`, JSON.stringify(embeddings))
  console.log('[embed] document cached', docId)
}

async function reviveDocumentEmbeddings(docId: string): Promise<VectorizedDocument> {
  const existing = await lf.getItem(`document-embeddings-${docId}`)

  console.log(`[embed] document revived`, docId, !!existing)

  if (!existing) return []
  return JSON.parse(existing as string)
}

async function cacheChatEmbeddings(chatId: string, embeddings: Record<string, TextEmbed>) {
  await lf.setItem(`chat-embeddings-${chatId}`, JSON.stringify(embeddings))
  console.log('[embed] chat cached', chatId)
}

async function reviveChatEmbeddings(chatId: string): Promise<Record<string, TextEmbed>> {
  const existing = await lf.getItem(`chat-embeddings-${chatId}`)

  console.log(`[embed] chat revived`, chatId, !!existing)

  if (!existing) return {}
  return JSON.parse(existing as string)
}

async function deleteChatCache(chatId: string) {
  await lf.removeItem(`chat-embeddings-${chatId}`)
}

async function hf() {
  // We use the CDN version to avoid run-time errors relating to accessing the `import` object
  const hf = await dynamicImport('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1')
  hf.env.allowLocalModels = false
  return hf as typeof HF
}

async function initCaptioner(model: string) {
  const api = await hf()
  console.log(`[caption] loading processor: ${model}`)
  CAPTION.proc = await api.AutoProcessor.from_pretrained(model, {})
  console.log(`[caption] loading model: ${model}`)
  CAPTION.pipeline = await api.AutoModelForCausalLM.from_pretrained(model, {
    device: DEVICE,
    // use_external_data_format: true,
    dtype: 'q4f16',
  })
  console.log(`[caption] ${model} loaded`)
}

async function pipeline<T extends TaskType>(
  task: T,
  model: string,
  callback: (data: any) => void
): Promise<AllTasks[T]> {
  const api = await hf()

  const p = api.pipeline(task, model, {
    dtype: 'fp16',
    progress_callback: callback,
  })

  return p
}

function toVectorArray(vectors: any) {
  if (Array.isArray(vectors) || vectors?.length) return vectors

  const list: number[] = []

  for (const key of Object.keys(vectors)) {
    const id = +key
    if (isNaN(id)) continue
    list[id] = vectors[key]
  }

  return list
}
