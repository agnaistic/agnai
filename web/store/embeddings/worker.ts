import { pipeline, Pipeline, env, RawImage } from '@xenova/transformers'
import {
  EmbedDocument,
  RequestChatEmbed,
  RequestDocEmbed,
  WorkerRequest,
  WorkerResponse,
} from './types'
import { docCache } from './cache'

// @ts-ignore
env.allowLocalModels = false

type TextEmbed = { msg: string; entityId: string; embed: Tensor; meta: any }
type RankedMsg = { msg: string; entityId: string; similarity: number; meta: any }
type Tensor = { data: number[]; dims: number[]; size: number; type: string }

type Embeddings = {
  [chatId: string]: { [msgId: string]: TextEmbed }
}

// let Tokenizer: PreTrainedTokenizer
let Embedder: Pipeline
let Captioner: Pipeline

const embeddings: Embeddings = {}
const documents: Record<string, Array<EmbedDocument & { embed: Tensor }>> = {}

const handlers: {
  [key in WorkerRequest['type']]: (msg: Extract<WorkerRequest, { type: key }>) => Promise<void>
} = {
  initSimilarity: async (msg) => {
    Embedder = await pipeline('feature-extraction', msg.model, {
      progress_callback: (data: { status: string; file: string; progress: number }) => {
        post('progress', data)
      },
    })
    console.log(`[embed] ready`)
    post('embedLoaded', {})
  },
  initCaptioning: async (msg) => {
    console.log(`[caption] loading`)
    Captioner = await pipeline('image-to-text', msg.model, {
      progress_callback: (data: { status: string; file: string; progress: number }) => {
        post('progress', data)
      },
    })
    console.log(`[caption] ready`)
    post('captionLoaded', {})
  },
  captionImage: async (msg) => {
    if (!Captioner) return
    const base64 = msg.image.includes(',') ? msg.image.split(',')[1] : msg.image

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
      console.log(`[captaion] caption failed`)
      console.error(ex)
    }
  },
  embedChat: async (msg) => {
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
  query: async (query) => {
    if (!Embedder) {
      post('result', { messages: [], requestId: query.requestId })
      return
    }

    const embed = await Embedder(query.text, { pooling: 'mean', normalize: true })
    const start = Date.now()
    if (embeddings[query.chatId]) {
      const embeds = Object.values(embeddings[query.chatId])
        .filter((msg) => msg.msg !== query.text)
        .map((msg) => {
          const similarity = calculateCosineSimilarity(embed.data, msg.embed.data)
          return { msg: msg.msg, entityId: msg.entityId, similarity, meta: msg.meta }
        })
        .sort(rank)
      post('result', { messages: embeds, requestId: query.requestId })
    }

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
  const type = msg.type === 'embedChat' ? 'chat' : 'document'
  const id = msg.type === 'embedChat' ? msg.chatId : msg.documentId
  if (EMBEDDING) {
    embedQueue.push(msg)
    console.log(`[${type}] ${id} queued`)
    return
  }

  EMBEDDING = true
  console.log(`[${type}] ${id} started`)
  if (msg.type === 'embedChat') {
    const cache = embeddings[msg.chatId]

    const filtered = msg.messages.filter((msg) => {
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
        meta: { created: msg.createdAt },
      }
    }
    console.log(`[chat] ${msg.chatId} embedded`)
  }

  if (msg.type === 'embedDocument') {
    for (const item of msg.documents) {
      const embed = await Embedder(item.msg, { pooling: 'mean', normalize: true })
      documents[msg.documentId].push({ msg: item.msg, embed, meta: item.meta })
    }
    console.log(`[document] ${msg.documentId} embedded`)
  }

  EMBEDDING = false

  const next = embedQueue.shift()
  if (next) {
    embed(next)
  }
}
