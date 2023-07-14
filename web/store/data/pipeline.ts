import wiki from 'wikijs'
import { api } from '../api'
import { getStore } from '../create'
import { AppSchema } from '/common/types'
import { toMap } from '/web/shared/util'
import { v4 } from 'uuid'

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

type ChatEmbed = { _id: string; msg: string; name: string; createdAt: string }

export const pipelineApi = {
  isAvailable,
  summarize,
  textToSpeech,
  chatEmbed,
  chatRecall,

  embedArticle,
  queryEmbedding,
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
  }, [] as ChatEmbed[])

  const now = Date.now()
  await method('post', `/embed/${chat._id}/reembed`, { messages: payload }).catch((err) => {
    goOffline()
    console.debug(`Failed to embed`, err)
  })
  console.debug('Embedding duration', now.toLocaleString(), 'ms')
}

async function chatRecall(chatId: string, message: string, created: string) {
  if (!online || !status.memory) return
  const res = await queryEmbedding(chatId, message, { maxDistance: 1.5 })
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

setInterval(() => {
  if (online) return
  if (!window.flags.pipeline || !window.usePipeline) return
  check().catch(() => null)
}, 3000)

function goOffline() {
  online = false
  status.memory = false
  status.summary = false
}

async function getCollections() {}
async function embedArticle(wikipage: string) {
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

  const push = (doc: string, meta: {}) => {
    embed.ids.push(v4())
    embed.documents.push(doc)
    embed.metadatas.push({ ...base, ...meta })
  }

  for (const item of content) {
    if (typeof item === 'string') {
      push(item, {})
      continue
    }

    const record = item as WikiItem
    if (record.content) {
      push(record.content, { section: record.title })
    }

    if (record.items) {
      for (const sub of record.items) {
        if (!sub.content) continue
        push(sub.content, { section: record.title, sub_section: sub.title })
      }
    }
  }

  await method('post', `/embed/${wikipage}`, embed)
}

type QueryOpts = {
  maxDistance?: number
}

async function queryEmbedding(embedding: string, message: string, opts: QueryOpts = {}) {
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

  const documents = res.result.result.documents[0]
  const metadatas = res.result.result.metadatas[0]
  const distances = res.result.result.distances[0]

  const filtered = documents
    .map((doc, i) => {
      const meta = metadatas[i]
      const distance = distances[i]

      return { ...meta, distance, text: doc }
    })
    .filter((doc) => doc.distance < maxDistance)

  console.log('Embedding retrieval', diff.toLocaleString(), 'ms')
  return filtered
}

async function check() {
  const res = await method('get', '/status')
  if (res.result) {
    online = true
    status.memory = res.result.memory
    status.summary = res.result.summarizer
  }
  if (res.error) online = false
}
