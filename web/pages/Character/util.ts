import { AppSchema } from '/common/types'
import { getAssetUrl, storage } from '/web/shared/util'
import { toastStore } from '/web/store'
import { charsApi } from '/web/store/data/chars'
import { exportCharacter } from '/common/characters'
import text from 'png-chunk-text'
import extract from 'png-chunks-extract'
import encode from 'png-chunks-encode'
import { imageApi } from '/web/store/data/image'

const CACHE_KEY = 'agnai-chatlist-cache'

export type ChatCharacter = { _id: string; name: string; description: string; avatar?: string }

export type ChatLine = {
  _id: string
  characters: ChatCharacter[]
  name: string
  createdAt: string
  updatedAt: string
  characterId: string
  messageCount?: number
}

export type SortType =
  | 'chat-updated'
  | 'chat-created'
  | 'character-name'
  | 'character-created'
  | 'bot-activity'
  | 'chat-count'

export type SortDirection = 'asc' | 'desc'

export type ChatGroup = { char: AppSchema.Character | null; chats: ChatLine[] }

export type ListCache = {
  sort: {
    field: SortType
    direction: SortDirection
  }
}

export function getChatSortableValue(chat: ChatLine, field: SortType) {
  switch (field) {
    case 'chat-updated':
      return chat.updatedAt
    case 'chat-created':
      return chat.createdAt
    case 'chat-count':
      return chat.messageCount ?? 0
    default:
      return 0
  }
}

export function getChatSortFunction(field: SortType, direction: SortDirection) {
  return (left: ChatLine, right: ChatLine) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getChatSortableValue(left, field)
    const r = getChatSortableValue(right, field)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

export function getCharacterSortableValue(char: AppSchema.Character, field: SortType) {
  switch (field) {
    case 'character-name':
      return char.name.toLowerCase()

    case 'character-created':
      return char.createdAt

    case 'bot-activity':
      return char.updatedAt

    default:
      return 0
  }
}

export function getCharSortFunction(type: SortType, direction: SortDirection) {
  return (left: AppSchema.Character, right: AppSchema.Character) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getCharacterSortableValue(left, type)
    const r = getCharacterSortableValue(right, type)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

export function groupAndSort(
  allChars: AppSchema.Character[],
  allChats: ChatLine[],
  type: SortType,
  direction: SortDirection
): Array<ChatGroup> {
  if (type === 'chat-updated' || type === 'chat-created' || type === 'chat-count') {
    const sorted = allChats.slice().sort(getChatSortFunction(type, direction))
    return [{ char: null, chats: sorted }]
  }

  const groups: ChatGroup[] = []
  const sortedChats = allChats.slice().sort(getChatSortFunction('chat-updated', 'desc'))

  const chars = allChars.slice().map((char) => {
    if (type !== 'bot-activity') return char
    const first = sortedChats.find((c) => c.characters.some((ch) => ch._id === char._id))
    return { ...char, updatedAt: first?.updatedAt || new Date(0).toISOString() }
  })

  chars.sort(getCharSortFunction(type, direction))

  for (const char of chars) {
    const chats = allChats
      .filter((ch) => ch.characters.some((c) => c._id === char._id))
      .sort(getChatSortFunction('chat-updated', 'desc'))
    groups.push({ char, chats })
  }

  return groups
}

export function getListCache(): ListCache {
  const existing = storage.localGetItem(CACHE_KEY)
  const defaultCache: ListCache = { sort: { field: 'chat-updated', direction: 'desc' } }

  if (!existing) {
    return defaultCache
  }

  return { ...defaultCache, ...JSON.parse(existing) }
}

export function saveListCache(cache: ListCache) {
  storage.localSetItem(CACHE_KEY, JSON.stringify(cache))
}

export function toCharacterMap(bots: AppSchema.Character[]) {
  const map = bots.reduce<Record<string, AppSchema.Character>>(
    (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
    {}
  )
  return map
}

export async function downloadCharCard(input: string | AppSchema.Character, format: string) {
  let char: AppSchema.Character

  if (typeof input === 'string') {
    const res = await charsApi.getCharacterDetail(input)
    if (res.error) {
      return toastStore.error(`Failed to download character: ${res.error}`)
    } else {
      char = res.result!
    }
  } else {
    char = input
  }

  const json = charToJson(char, format)
  const image = getAssetUrl(char.avatar!)
  /**
   * Only PNG and APNG files can contain embedded character information
   * If the avatar image is not either of these formats, we must convert it
   */

  const dataurl = await imageToDataURL(image)
  const base64 = dataurl.split(',')[1]
  const imgBuffer = Buffer.from(window.atob(base64), 'binary')
  const chunks = extract(imgBuffer).filter((chunk) => chunk.name !== 'tEXt')
  const output = Buffer.from(json, 'utf8').toString('base64')
  const lastChunkIndex = chunks.length - 1
  const chunksToExport = [
    ...chunks.slice(0, lastChunkIndex),
    text.encode('chara', output),
    chunks[lastChunkIndex],
  ]
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([Buffer.from(encode(chunksToExport))]))
  anchor.download = `${char.name}.card.png`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

async function imageToDataURL(image: string) {
  const { ext } = getExt(image)

  const base64 = await getImageBase64(image)
  const apng = await isAPNG(base64)
  if (apng || ext === 'apng') {
    return base64
  }

  const element = await asyncImage(base64)

  const canvas = document.createElement('canvas')
  canvas.width = element.image.naturalWidth
  canvas.height = element.image.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(element.image, 0, 0)
  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl
}

function charToJson(char: AppSchema.Character, format: string) {
  const { _id, ...json } = char

  const copy = { ...char }

  if (format === 'native') {
    return JSON.stringify(json, null, 2)
  }

  const content = exportCharacter(copy, format as any)
  return JSON.stringify(content, null, 2)
}

function getExt(url: string): { type: 'base64' | 'url'; ext: string } {
  if (url.startsWith('data:')) {
    const [header] = url.split(',')
    const ext = header.slice(11, -7)
    return imageApi.ALLOWED_TYPES.has(ext)
      ? { type: 'base64', ext }
      : { type: 'base64', ext: 'unknown' }
  }

  const ext = url.split('.').slice(-1)[0]
  if (imageApi.ALLOWED_TYPES.has(ext)) return { type: 'url', ext }
  return { type: 'url', ext: 'unknown' }
}

async function getImageBase64(image: string) {
  if (image.startsWith('data:')) return image

  if (!image.startsWith('http')) {
    image = getAssetUrl(image)
  }

  const base64 = await imageApi.getImageData(image)
  return base64!
}

function asyncImage(src: string) {
  return new Promise<{ name: string; image: HTMLImageElement }>(async (resolve, reject) => {
    const data = await getImageBase64(src)
    const image = new Image()
    image.setAttribute('crossorigin', 'anonymous')
    image.src = data

    image.onload = () => resolve({ name: src, image })
    image.onerror = (ev) => reject(ev)
  })
}

async function isAPNG(base64: string) {
  if (base64.startsWith('data:')) {
    base64 = base64.split(',')[1]
  }
  const buffer = Buffer.from(window.atob(base64), 'binary')
  try {
    for (const chunk of extract(buffer)) {
      if (chunk.name === 'IDAT') return false
      if (chunk.name === 'acTL') return true
    }

    return false
  } catch (ex) {
    return false
  }
}
