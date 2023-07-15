import wiki from 'wikijs'
import { api } from '../api'
import { getStore } from '../create'
import { AppSchema, Memory } from '/common/types'
import { toMap } from '/web/shared/util'
import { v4 } from 'uuid'
import { slugify } from '/common/util'

type WikiItem = {
  title: string
  content: string
  items?: WikiItem[]
}

type Embedding = {
  documents: string[]
  ids: string[]
  metadatas: Array<object>
}

export const pipelineApi = {
  isAvailable,
  summarize,
  textToSpeech,
  chatEmbed,
  chatRecall,

  embedArticle,
  embedPdf,
  queryEmbedding,
  listCollections,
}

const baseUrl = `http://localhost:5001`

let online = false
const status = {
  memory: false,
  summary: false,
}

function isAvailable() {
  return { online, ...status }
}

/**
 * Not yet implemented
 */
async function textToSpeech(text: string) {
  const res = await method('post', '/tts', { text })
  return res
}

async function summarize(text: string) {
  if (!online || !status.summary) return
  const res = await method('post', '/summarize', { prompt: text })
  return res
}

async function listCollections() {
  const res = await method('get', '/embed')
  if (res.result) {
    return res.result.result
  }

  return []
}

async function chatEmbed(chat: AppSchema.Chat, messages: AppSchema.ChatMessage[]) {
  if (!online || !status.memory) return

  const { chatProfiles } = getStore('chat')()
  const { profile } = getStore('user')()
  const {
    characters: { map },
  } = getStore('character')()

  const profiles = toMap(chatProfiles)
  if (profile) {
    profiles[profile.userId] = profile
  }

  const payload = messages.reduce((prev, msg) => {
    const name = getName(msg, map, profiles)

    if (!name) {
      console.debug(`Could not get name: (${msg.characterId},${msg.userId})`)
      return prev
    }

    prev.push({ _id: msg._id, name, msg: msg.msg, createdAt: msg.createdAt })

    return prev
  }, [] as Memory.ChatEmbed[])

  const now = Date.now()
  await method('post', `/embed/${chat._id}/reembed`, { messages: payload }).catch((err) => {
    goOffline()
    console.debug(`Failed to embed`, err)
  })
  console.debug('Embedding duration', Date.now() - now, 'ms')
}

async function chatRecall(chatId: string, message: string, created: string) {
  if (!online || !status.memory) return
  const res = await queryEmbedding<{ name: string }>(chatId, message, { maxDistance: 1.5 })
  const docs = res.filter((doc) => doc.date < created)

  return docs
}

const method: typeof api.method = (method, path, body, opts) => {
  return api.method(method, `${baseUrl}${path}`, body, { ...opts, noAuth: true })
}

function getName(
  msg: AppSchema.ChatMessage,
  bots: Record<string, AppSchema.Character>,
  profiles: Record<string, AppSchema.Profile>
) {
  const name = msg.characterId ? bots[msg.characterId]?.name : profiles[msg.userId!]?.handle
  return name
}

type EmbedQueryResult = {
  ids: Array<string[]>
  distances: [number[]]
  documents: [string[]]
  metadatas: [Array<{ date: string; name: string }>]
}

setInterval(pipelineHeartbeat, 3000)
setTimeout(pipelineHeartbeat, 100)

function pipelineHeartbeat() {
  if (online) return
  if (!window.usePipeline) return
  check().catch(() => null)
}

function goOffline() {
  online = false
  status.memory = false
  status.summary = false
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

  const base = { created: new Date().toISOString(), article: wikipage }

  const embed: Embedding = {
    ids: [v4()],
    documents: [summary],
    metadatas: [{ ...base, section: 'Summary' }],
  }

  for (const item of content) {
    if (typeof item === 'string') {
      addSection(item, {}, embed)
      continue
    }

    const record = item as WikiItem
    if (record.content) {
      addSection(record.content, { section: record.title }, embed)
    }

    if (record.items) {
      for (const sub of record.items) {
        if (!sub.content) continue
        addSection(sub.content, { section: record.title, sub_section: sub.title }, embed)
      }
    }
  }

  const slug = slugify(wikipage)
  await method('post', `/embed/${slug}`, embed)
}

async function embedPdf(name: string, file: File) {
  const { extractPdf } = await import('./pdf-import')
  const data = await extractPdf(file)
  const embed: Embedding = {
    ids: [],
    documents: [],
    metadatas: [],
  }

  if (!data.text || !data.outline) {
    throw new Error(`Could not embed PDF: Could not extract pages`)
  }

  for (let i = 0; i < data.text.length; i++) {
    const text = data.text[i]
    const page = data.outline.find((sect: any) => (sect.page == null ? false : sect.page >= i))

    embed.ids.push(v4())
    embed.documents.push(text.replace(/\n/g, ' ').replace(/ +/g, ' '))
    embed.metadatas.push({ page: i, section: page?.title })
  }

  const slug = name ? name : slugify(file.name)
  await method('post', `/embed/${slug.slice(0, 63)}`, embed)
}

type QueryOpts = {
  maxDistance?: number
}

async function queryEmbedding<T = {}>(
  embedding: string,
  message: string,
  opts: QueryOpts = {}
): Promise<Array<Memory.UserEmbed<T>>> {
  const maxDistance = opts.maxDistance ?? 1.5

  if (!online || !status.memory) throw new Error(`Embeddings are not available: Offline or disabled`)
  const now = Date.now()
  const res = await method<{ result: EmbedQueryResult }>('post', `/embed/${embedding}/query`, {
    message,
  }).catch((err) => {
    goOffline()
    console.error('Failed memory retrieval', err)
    return { result: null }
  })

  const diff = Date.now() - now

  if (!res.result) throw new Error(`Could not query embedding`)

  if (!res.result.result) {
    return []
  }

  const documents = res.result.result.documents[0]
  const metadatas = res.result.result.metadatas[0]
  const distances = res.result.result.distances[0]
  const ids = res.result.result.ids[0]

  const filtered = documents
    .map((doc, i) => {
      const meta = metadatas[i]
      const distance = distances[i]

      return { ...meta, distance, text: doc, id: ids[i] }
    })
    .filter((doc) => doc.distance < maxDistance)

  console.log('Embedding retrieval', diff.toLocaleString(), 'ms')
  return filtered as any
}

async function check() {
  const res = await method('get', '/status')
  if (res.result) {
    if (!online) {
      getStore('toasts').success('Pipeline connected')
    }
    online = true
    status.memory = res.result.memory
    status.summary = res.result.summarizer
  }
  if (res.error) online = false
}

function addSection<T>(
  content: string,
  meta: T,
  embed: Embedding
): Array<{ content: string; meta: T & { sentence: number } }> {
  const sentences = content.split('.')

  for (let i = 0; i < sentences.length; i++) {
    embed.ids.push(v4())
    embed.documents.push(sentences[i].trim().replace(/\n/g, ' ').replace(/ +/g, ' '))
    embed.metadatas.push({ ...meta, sentence: i + 1 })
  }
  return sentences.map((text, i) => ({ content: text, meta: { ...meta, sentence: i + 1 } }))
}
