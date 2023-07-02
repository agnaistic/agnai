import { api } from '../api'
import { getStore } from '../create'
import { settingStore } from '../settings'
import { userStore } from '../user'
import { AppSchema } from '/common/types'
import { toMap } from '/web/shared/util'

export const pipelineApi = {
  isAvailable,
  summarize,
  textToSpeech,
  memoryEmbed,
  memoryRecall,
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

type ChatMemory = { _id: string; msg: string; name: string; createdAt: string }

async function memoryEmbed(chat: AppSchema.Chat, messages: AppSchema.ChatMessage[]) {
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
  }, [] as ChatMemory[])

  const now = Date.now()
  await method('post', `/memory/${chat._id}/reembed`, { messages: payload }).catch((err) => {
    goOffline()
    console.debug(`Failed to embed`, err)
  })
  console.debug('Embedding duration', now.toLocaleString(), 'ms')
}

async function memoryRecall(chatId: string, message: string, created: string) {
  if (!online || !status.memory) return
  const now = Date.now()
  const res = await method<{ memories: MemoryResponse }>('post', `/memory/${chatId}`, {
    message,
  }).catch((err) => {
    goOffline()
    console.error('Failed memory retrieval', err)
    return { result: null }
  })

  const diff = Date.now() - now

  if (!res.result) return

  const documents = res.result.memories.documents[0]
  const metadatas = res.result.memories.metadatas[0]
  const distances = res.result.memories.distances[0]

  const filtered = documents
    .map((doc, i) => {
      const meta = metadatas[i]
      const distance = distances[i]

      return { ...meta, distance, text: doc }
    })
    .filter((doc) => doc.date < created && doc.distance < 1.5)

  console.log('Memory retrieval', diff.toLocaleString(), 'ms')
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

type MemoryResponse = {
  ids: Array<string[]>
  distances: [number[]]
  documents: [string[]]
  metadatas: [Array<{ date: string; name: string }>]
}

setInterval(() => {
  if (online) return

  const { flags } = settingStore()
  const { user } = userStore()

  if (!flags.pipeline || !user?.useLocalPipeline) return
  check().catch(() => null)
}, 3000)

function goOffline() {
  online = false
  status.memory = false
  status.summary = false
}
