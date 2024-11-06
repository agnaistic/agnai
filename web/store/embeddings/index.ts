import wiki from 'wikijs'
import { EmbedDocument, WorkerRequest, WorkerResponse } from './types'
import { env } from '@xenova/transformers'
import { AppSchema } from '/common/types'
import { v4 } from 'uuid'
import { slugify } from '/common/util'
import { toastStore } from '../toasts'
import { docCache } from './cache'
import type { MemoryState } from '../memory'
import type { Tiktoken } from 'js-tiktoken'
import { getStore } from '../create'

type Callback = () => void
type QueryResult = Extract<WorkerResponse, { type: 'result' }>

type WikiItem = {
  title: string
  content: string
  items?: WikiItem[]
}

const models = {
  // embedding: 'Xenova/all-mpnet-base-v2',
  embedding: 'Xenova/all-MiniLM-L6-v2',
  // captioning: 'Xenova/vit-gpt2-image-captioning',
  // WIP
  captioning: 'http://localhost:5000/api/caption',
}

// @ts-ignore
env.allowLocalModels = false

let EMBED_READY = false
let CAPTION_READY = false
let MEMORY_SET: (state: Partial<MemoryState>) => void
let MEMORY_GET: () => MemoryState

let embedQueue: { chatId: string; messages: AppSchema.ChatMessage[] } | undefined
const documentQueue: string[] = []

const embedCallbacks = new Map<string, (msg: Extract<WorkerResponse, { type: 'result' }>) => void>()
const captionCallbacks = new Map<string, (caption: string) => void>()
const encodeCallbacks = new Map<string, { t: number; cb: (tokens: number[]) => void }>()
const decodeCallbacks = new Map<string, (text: string) => void>()

let onEmbedReady: Callback = () => {}
let onCaptionReady: Callback = () => {}

// @ts-ignore
const embedWorker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })
// @ts-ignore
const imageWorker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })
// @ts-ignore
const tokenWorker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })

export const embedApi = {
  setup: async (getter: typeof MEMORY_GET, setter: typeof MEMORY_SET) => {
    MEMORY_GET = getter
    MEMORY_SET = setter

    const ids = await docCache.getIds()
    const embeds = ids.map((id) => ({ id, state: 'not-loaded' }))
    setter({ embeds })
  },
  initSimiliary: () => {
    post('initSimilarity', { model: models.embedding })
  },
  encode,
  decode,
  embedChat,
  embedArticle,
  embedPdf,
  embedFile,
  embedPlainText,
  query,
  queryChat,
  loadDocument,
  removeDocument: async (docId: string) => {
    await docCache.deleteDoc(docId)
    const { embeds } = MEMORY_GET()
    const next = embeds.filter((e) => e.id !== docId)
    MEMORY_SET({ embeds: next })
  },
  cache: docCache,
  captionImage,
  onEmbedReady: (cb: Callback) => {
    onEmbedReady = cb
  },
  onCaptionReady: (cb: Callback) => {
    onCaptionReady = cb
  },
}

const handlers: {
  [key in WorkerResponse['type']]: (
    worker: 'embed' | 'image',
    msg: Extract<WorkerResponse, { type: key }>
  ) => void
} = {
  encoding: (_type, msg) => {
    const cb = encodeCallbacks.get(msg.id)
    if (cb) {
      cb.cb(msg.tokens)
    }
    encodeCallbacks.delete(msg.id)
  },
  decoding: (_type, msg) => {
    const cb = decodeCallbacks.get(msg.id)
    cb?.(msg.text)
    decodeCallbacks.delete(msg.id)
  },
  init: (type) => {
    try {
      const user = getStore('user').getState()
      const disableLTM = user.user?.disableLTM ?? true
      if (type === 'embed') {
        if (disableLTM) return
        post('initSimilarity', { model: models.embedding })
      }

      if (type === 'image' && window.flags.caption) {
        const httpCaptioning = models.captioning.startsWith('http')
        if (disableLTM && !httpCaptioning) return
        post('initCaptioning', { model: models.captioning })
      }
    } catch (ex) {}
  },
  embedLoaded: async () => {
    EMBED_READY = true
    onEmbedReady()

    if (embedQueue) {
      post('embedChat', embedQueue)
      embedQueue = undefined
    }

    do {
      const id = documentQueue.shift()
      if (!id) return
      const document = await docCache.getDoc(id)
      if (!document) continue
      post('embedDocument', document)
    } while (true)
  },
  captionLoaded: () => {
    CAPTION_READY = true
    onCaptionReady()
  },
  caption: (_, msg) => {
    const callback = captionCallbacks.get(msg.requestId)
    if (!callback) return

    callback(msg.caption)
    captionCallbacks.delete(msg.requestId)
  },
  embedded: (_, msg) => {
    if (msg.kind === 'chat') return
    toastStore.info(`Embeddeding ready`)
  },
  progress: (_, msg) => {},
  result: (_, msg) => {
    const listener = embedCallbacks.get(msg.requestId)
    if (!listener) return

    listener(msg)
    embedCallbacks.delete(msg.requestId)
  },
  status: (_, msg) => {
    if (!MEMORY_GET || !MEMORY_SET) return
    const { embeds } = MEMORY_GET()
    if (msg.kind === 'chat') return
    const next = embeds
      .slice()
      .map((e) => (e.id === msg.id ? { id: msg.id, state: msg.status } : e))

    if (!next.some((e) => e.id === msg.id)) {
      next.push({ id: msg.id, state: msg.status })
    }

    MEMORY_SET({ embeds: next })
  },
}

embedWorker.onmessage = (event) => {
  const msg = event.data as WorkerResponse
  const handler = handlers[msg.type]
  if (handler) {
    handler('embed', msg as any)
  }
}

imageWorker.onmessage = (event) => {
  const msg = event.data as WorkerResponse
  const handler = handlers[msg.type]
  if (handler) {
    handler('image', msg as any)
  }
}

tokenWorker.onmessage = (event) => {
  const msg = event.data as WorkerResponse
  const handler = handlers[msg.type]
  if (handler) {
    handler('image', msg as any)
  }
}

function post<T extends WorkerRequest['type']>(
  type: T,
  payload: Omit<Extract<WorkerRequest, { type: T }>, 'type'>
) {
  const worker =
    type === 'decode' || type === 'encode'
      ? tokenWorker
      : type === 'captionImage' || type === 'initCaptioning'
      ? imageWorker
      : embedWorker

  worker.postMessage({ type, ...payload })
}

function embedChat(chatId: string, messages: AppSchema.ChatMessage[]) {
  if (!EMBED_READY) {
    embedQueue = { chatId, messages }
    return
  }

  post('embedChat', { chatId, messages })
}

async function queryChat(chatId: string, text: string, before: string, path: string[]) {
  const requestId = v4()
  if (!EMBED_READY) {
    return { type: 'result', requestId, messages: [] }
  }

  const promise = new Promise<QueryResult>((resolve) => {
    const timer = setTimeout(() => {
      console.warn('Embedding request timed out')
      resolve({ type: 'result', requestId, messages: [] })
    }, 1000)
    embedCallbacks.set(requestId, (msg) => {
      clearTimeout(timer)
      resolve(msg)
    })
  })

  post('queryChat', { requestId, chatId, text, beforeDate: before, path })

  return promise
}

async function query(chatId: string, text: string): Promise<QueryResult> {
  const requestId = v4()
  if (!EMBED_READY) {
    return { type: 'result', requestId, messages: [] }
  }

  const promise = new Promise<QueryResult>((resolve) => {
    const timer = setTimeout(() => {
      console.warn('Embedding request timed out')
      resolve({ type: 'result', requestId, messages: [] })
    }, 1000)
    embedCallbacks.set(requestId, (msg) => {
      clearTimeout(timer)
      resolve(msg)
    })
  })

  post('query', { requestId, chatId, text })

  return promise
}

const TOKENIZE_LIMIT = 25

let encoder: Tiktoken

async function getEncoder() {
  if (encoder) return encoder

  const mod = await import('js-tiktoken').then((mod) => mod.getEncoding)
  encoder = mod('cl100k_base')
  return encoder
}

async function encode(text: string): Promise<number[]> {
  const id = v4()
  return new Promise<number[]>((resolve) => {
    const start = Date.now()
    const timer = setTimeout(async () => {
      const encoder = await getEncoder()
      const result = encoder.encode(text)
      resolve(result)
    }, TOKENIZE_LIMIT)
    const resolver = (tokens: number[]) => {
      clearTimeout(timer)
      resolve(tokens)
    }
    encodeCallbacks.set(id, { t: start, cb: resolver })
    post('encode', { id, text })
  })
}

async function decode(tokens: number[]): Promise<string> {
  const id = v4()
  return new Promise<string>((resolve) => {
    const timer = setTimeout(async () => {
      const encoder = await getEncoder()
      const result = encoder.decode(tokens)
      resolve(result)
    }, TOKENIZE_LIMIT)
    const resolver = (text: string) => {
      clearTimeout(timer)
      resolve(text)
    }
    decodeCallbacks.set(id, resolver)
    post('decode', { id, tokens })
  })
}

async function loadDocument(documentId: string) {
  if (!EMBED_READY) {
    if (documentQueue.includes(documentId)) return
    documentQueue.push(documentId)
    return
  }

  const doc = await docCache.getDoc(documentId)
  if (!doc) return

  post('embedDocument', doc)
}

async function embedArticle(wikipage: string) {
  wikipage = decodeURI(wikipage)
  if (wikipage.includes('wikipedia.org/')) {
    wikipage = wikipage.split('/').slice(-1)[0]
  }

  if (!wikipage) {
    throw new Error(`Could not retrieve article: Invalid page requested`)
  }

  const page = await wiki({ apiUrl: 'https://en.wikipedia.org/w/api.php' }).page(wikipage)

  const summary = await page.summary()
  const content = await page.content()

  const embeds: EmbedDocument[] = [
    {
      msg: summary,
      meta: { section: 'Summary', article: wikipage },
    },
  ]

  for (const item of content) {
    if (typeof item === 'string') {
      addSection(item, {}, embeds)
      continue
    }

    const record = item as WikiItem
    if (record.content) {
      addSection(record.content, { section: record.title }, embeds)
    }

    if (record.items) {
      for (const sub of record.items) {
        if (!sub.content) continue
        addSection(sub.content, { section: record.title, sub_section: sub.title }, embeds)
      }
    }
  }

  const slug = slugify(wikipage)
  post('embedDocument', { documentId: slug, documents: embeds })
}

async function embedPdf(name: string, file: File) {
  const { extractPdf } = await import('../data/pdf-import')
  const data = await extractPdf(file)
  const embed: EmbedDocument[] = []

  if (!data.text) {
    throw new Error(`Could not embed PDF: Could not extract pages`)
  }

  for (let i = 0; i < data.text.length; i++) {
    let text = data.text[i]
    if (!text) continue
    text = text.replace(/(\r\n|\r|\n)/g, ' ').replace(/ +/g, ' ')

    const page = data.outline?.find((sect: any) => (sect.page == null ? false : sect.page >= i))

    const sentences = text.split('.').filter((t) => !!t.trim())
    for (let j = 0; j < sentences.length; j++) {
      embed.push({
        msg: sentences[j].replace(/\n/g, ' ').replace(/ +/g, ' '),
        meta: { page: i, section: page?.title, line: j + 1 },
      })
    }
  }

  const slug = name ? name : slugify(file.name)
  post('embedDocument', { documentId: slug, documents: embed })
}

async function embedFile(name: string, file: File) {
  const buffer = await file.arrayBuffer().then((b) => Buffer.from(b))
  const text = buffer.toString()
  const dot = file.name.lastIndexOf('.')
  const filename = dot > -1 ? file.name.slice(0, dot) : file.name

  return embedPlainText(name || filename, text)
}

async function embedPlainText(name: string, text: string) {
  const lines = text
    .replace(/(\\n|\r\n|\r)/g, '\n')
    .replace(/\n+/g, '\n')
    .split('\n')
    .filter((l) => !!l.trim())

  const embeds = lines.map((line, i) => ({ msg: line, meta: { line: i + 1 } }))
  const slug = slugify(name)

  post('embedDocument', { documentId: slug, documents: embeds })
}

function addSection<T>(
  content: string,
  meta: T,
  embeds: EmbedDocument[]
): Array<{ content: string; meta: T & { sentence: number } }> {
  const sentences = content.split('.')

  for (let i = 0; i < sentences.length; i++) {
    embeds.push({
      msg: sentences[i].trim().replace(/\n/g, ' ').replace(/ +/g, ' '),
      meta: { ...meta, sentence: i + 1 },
    })
  }

  return sentences.map((text, i) => ({ content: text, meta: { ...meta, sentence: i + 1 } }))
}

async function captionImage(dataUrl: string): Promise<string> {
  if (!CAPTION_READY) {
    toastStore.warn(`Image captioning not ready yet`)
  }

  const requestId = v4()
  post('captionImage', { requestId, image: dataUrl })

  return new Promise((resolve) => {
    captionCallbacks.set(requestId, (caption: string) => {
      resolve(caption)
    })
  })
}
