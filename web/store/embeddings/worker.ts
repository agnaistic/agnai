import { pipeline, Pipeline, env, RawImage } from '@xenova/transformers'
import {
  EmbedDocument,
  RequestChatEmbed,
  RequestDocEmbed,
  WorkerRequest,
  WorkerResponse,
} from './types'
import { docCache } from './cache'
import { getEncoding } from 'js-tiktoken'

// @ts-ignore
env.allowLocalModels = false

const encoder = getEncoding('cl100k_base')

type TextEmbed = { msg: string; entityId: string; embed: Tensor; meta: any }
type RankedMsg = { msg: string; entityId: string; similarity: number; meta: any }
type Tensor = { data: number[]; dims: number[]; size: number; type: string }

type Embeddings = {
  [chatId: string]: { [msgId: string]: TextEmbed }
}

// let Tokenizer: PreTrainedTokenizer
let Embedder: Pipeline
let Captioner: Pipeline
let EMBED_INITED = false
let CAPTION_INITED = false
let HttpCaptioner: (base64: string) => Promise<any>

const embeddings: Embeddings = {}
const documents: Record<string, Array<EmbedDocument & { embed: Tensor }>> = {}

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
    if (EMBED_INITED) {
      console.log('[embed] already inited')
      return
    }
    EMBED_INITED = true
    Embedder = await pipeline('feature-extraction', msg.model, {
      // quantized: true,
      progress_callback: (data: { status: string; file: string; progress: number }) => {
        post('progress', data)
      },
    })
    console.log(`[embed] ready`)
    post('embedLoaded', {})
  },
  initCaptioning: async (msg) => {
    if (CAPTION_INITED) {
      return
    }

    CAPTION_INITED = true
    console.log(`[caption] loading`)

    if (msg.model.startsWith('http')) {
      HttpCaptioner = (base64: string) =>
        fetch(msg.model, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })
          .then((r) => r.json())
          .then((res) => res.caption.trim())
      post('captionLoaded', {})
      console.log('[caption] http ready')
      return
    }
    Captioner = await pipeline('image-to-text', msg.model, {
      // quantized: true,
      progress_callback: (data: { status: string; file: string; progress: number }) => {
        post('progress', data)
      },
    })
    console.log(`[caption] ready`)
    post('captionLoaded', {})
  },
  captionImage: async (msg) => {
    if (!CAPTION_INITED && !HttpCaptioner) return

    const base64 = msg.image.includes(',') ? msg.image.split(',')[1] : msg.image

    if (HttpCaptioner) {
      const caption = await HttpCaptioner(base64)
      console.log(`[caption] done`, caption)
      post('caption', { requestId: msg.requestId, caption })
      return
    }

    if (!Captioner) return

    const buffer = Buffer.from(base64, 'base64')
    const blob = new Blob([new Uint8Array(buffer)])
    const image = await RawImage.fromBlob(blob)

    console.log(`[caption] starting`)
    try {
      const result = await Captioner(image)
      const text = result[0].generated_text
      console.log(`[caption] done: ${text}`)
      post('caption', { requestId: msg.requestId, caption: text })
    } catch (ex) {
      console.log(`[caption] caption failed`)
      console.error(ex)
    }
  },
  embedChat: async (msg) => {
    if (!EMBED_INITED) return
    if (!Embedder) return
    if (!embeddings[msg.chatId]) {
      embeddings[msg.chatId] = {}
    }

    embed(msg)
  },
  embedDocument: async (msg) => {
    if (!Embedder) return
    if (!documents[msg.documentId]) {
      documents[msg.documentId] = []
    }

    await docCache.saveDoc(msg.documentId, msg)
    embed(msg)
  },
  queryChat: async (query) => {
    if (!embeddings[query.chatId]) return
    const embed = await Embedder(query.text, { pooling: 'mean', normalize: true })

    const path = new Set(query.path)

    const embeds = Object.values(embeddings[query.chatId])
      .filter((msg) => {
        if (!path.has(msg.meta.id)) return false
        const isBefore = !query.beforeDate ? true : msg.meta.created <= query.beforeDate
        return msg.msg !== query.text && isBefore
      })
      .map((msg) => {
        const similarity = calculateCosineSimilarity(embed.data, msg.embed.data)
        return { msg: msg.msg, entityId: msg.entityId, similarity, meta: msg.meta }
      })
      .sort(rank)
    post('result', { messages: embeds, requestId: query.requestId })
  },
  query: async (query) => {
    if (!Embedder) {
      post('result', { messages: [], requestId: query.requestId })
      return
    }

    const embed = await Embedder(query.text, { pooling: 'mean', normalize: true })
    const start = Date.now()

    if (documents[query.chatId]) {
      const embeds = documents[query.chatId]
        .filter((msg) => msg.msg !== query.text)
        .map((msg) => {
          const similarity = calculateCosineSimilarity(embed.data, msg.embed.data)
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

  for (let i = 0; i < compare.length; i++) {
    dotProduct += compare[i] * input[i]
    queryMagnitude += compare[i] ** 2
    embeddingMagnitude += input[i] ** 2
  }
  return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude))
}

function rank(left: RankedMsg, right: RankedMsg) {
  return right.similarity - left.similarity
}

post('init', {})

const embedQueue: Array<RequestChatEmbed | RequestDocEmbed> = []

let EMBEDDING = false
async function embed(msg: RequestChatEmbed | RequestDocEmbed) {
  if (!EMBED_INITED) return

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
  if (msg.type === 'embedChat') {
    const seen = new Set<string>()
    const cache = embeddings[msg.chatId]

    const filtered = msg.messages.filter((msg) => {
      seen.add(msg._id)
      const prev = embeddings[msg.chatId][msg._id]
      if (!prev) return true
      if (prev.msg !== msg.msg) return true
      return false
    })

    for (const msg of filtered) {
      if (msg.adapter === 'image' || msg.ooc) continue
      const embedding = await Embedder(msg.msg, { pooling: 'mean', normalize: true })
      cache[msg._id] = {
        entityId: msg.characterId || msg.userId || '',
        msg: msg.msg,
        embed: embedding,
        meta: { id: msg._id, created: msg.createdAt },
      }
    }

    let deleted = 0
    for (const cachedId of Object.keys(cache)) {
      if (seen.has(cachedId)) continue
      delete cache[cachedId]
      deleted++
    }

    // const pre = deleted > 0 ? '+' : ''
    // console.log(`[chat] ${msg.chatId} embedded (${pre}${deleted})`)
  }

  if (msg.type === 'embedDocument') {
    let embedded = 0
    documents[msg.documentId] = []
    for (const item of msg.documents) {
      const embed = await Embedder(item.msg, { pooling: 'mean', normalize: true })
      embedded++
      const percent = ((embedded / msg.documents.length) * 100).toFixed(1)
      post('status', { id, kind: type, status: `loading (${percent}%)` })
      documents[msg.documentId].push({ msg: item.msg, embed, meta: item.meta })
    }
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
