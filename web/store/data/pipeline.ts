import wiki from 'wikijs'
import { api } from '../api'
import { getStore } from '../create'
import { AppSchema, Memory } from '/common/types'
import { toMap } from '/web/shared/util'
import { v4 } from 'uuid'
import { slugify } from '/common/util'
import { toastStore } from '../toasts'

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
  reconnect,
}

let baseUrl = location.origin

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
  const res = await method('post', '/pipeline/summarize', { prompt: text })
  return res
}

async function listCollections() {
  if (!online) return []

  const res = await method('get', '/pipeline/embed')
  if (res.result) {
    return res.result.result
  }

  return []
}

async function chatEmbed(chat: AppSchema.Chat, messages: AppSchema.ChatMessage[]) {
  if (!online || !status.memory) return

  const { chatProfiles } = getStore('chat').getState()
  const { profile } = getStore('user').getState()
  const { characters } = getStore('character').getState()

  const profiles = toMap(chatProfiles)
  if (profile) {
    profiles[profile.userId] = profile
  }

  const payload = messages.reduce((prev, msg) => {
    const name = getName(msg, characters.map, profiles)

    if (!name) {
      console.debug(`Could not get name: (${msg.characterId},${msg.userId})`)
      return prev
    }

    prev.push({ _id: msg._id, name, msg: msg.msg, createdAt: msg.createdAt })

    return prev
  }, [] as Memory.ChatEmbed[])

  const now = Date.now()
  await method('post', `/pipeline/embed/${chat._id}/reembed`, { messages: payload }).catch(
    (err) => {
      goOffline()
      console.debug(`Failed to embed`, err)
    }
  )
  console.debug('Embedding duration', Date.now() - now, 'ms')
}

async function chatRecall(chatId: string, message: string, created: string) {
  if (!online || !status.memory) return
  const res = await queryEmbedding<{ name: string }>(chatId, message, { maxDistance: 1.5 })
  const docs = res.filter((doc) => doc.date < created)

  return docs
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
  await method('post', `/pipeline/embed/${slug}`, embed)
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
  await method('post', `/pipeline/embed/${slug.slice(0, 63)}`, embed)
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

  if (!online || !status.memory)
    throw new Error(`Embeddings are not available: Offline or disabled`)
  const now = Date.now()
  const res = await method<{ result: EmbedQueryResult }>(
    'post',
    `/pipeline/embed/${embedding}/query`,
    {
      message,
    }
  ).catch((err) => {
    goOffline()
    console.error('Failed memory retrieval', err)
    return { result: undefined, error: err.message || err, status: 500 }
  })

  const diff = Date.now() - now

  if (res.error && res.status >= 500) {
    throw new Error(`Could not query embedding: ${res.error}`)
  }

  if (!res.result?.result) {
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

/**
 * Pipeline health/status checks
 */

setTimeout(() => {
  const store = getStore('settings')

  store.subscribe((next, prev) => {
    // Begin polling when app initialised
    if (prev.initLoading && !next.initLoading) {
      reconnect()
    }
  })
}, 100)

function reconnect(notify = false) {
  if (!window.usePipeline) return
  if (online) return

  check()
    .catch((ex) => {
      online = false
      if (notify) {
        toastStore.warn(`Pipeline API: ${ex.message || ex}`)
      }
      return null
    })
    .finally(() => {
      getStore('settings').setState({ pipelineOnline: online })
    })
}

async function check() {
  const { config } = getStore('settings').getState()
  /**
   * 1. If accessing Agnai from an alternate host with a development port, use that host
   * 2. If the AppConfig is running with the pipeline proxy, use the current API url
   * 3. Otherwise use localhost:5001
   */
  const apiUrl =
    location.port === '1234' ? `http://${location.hostname}:3001` : `http://${location.host}`
  baseUrl = config.pipelineProxyEnabled ? apiUrl : `http://localhost:5001`

  const res = await method('get', '/pipeline/status')
  if (res.result && res.result.status === 'ok') {
    if (!online) {
      getStore('toasts').success('Pipeline connected')
    }
    online = true
    status.memory = res.result.memory
    status.summary = res.result.summarizer
  }
  if (res.error) {
    online = false
    if (res.status === 503) {
      throw `Server could not be reached`
    }

    throw ` ${res.error} (${res.status})`
  }
}

const method: typeof api.method = async (method, path, body, opts) => {
  try {
    const res = await api.method(method, `${baseUrl}${path}`, body, { ...opts, noAuth: true })
    return res
  } catch (ex: any) {
    online = false
    getStore('settings').setState({ pipelineOnline: false })
    return { error: ex.message || ex, result: undefined, status: 0 }
  }
}
