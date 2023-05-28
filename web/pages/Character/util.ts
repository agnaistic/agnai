import { AppSchema } from '/srv/db/schema'
import { safeLocalStorage } from '/web/shared/util'

const CACHE_KEY = 'agnai-chatlist-cache'

export type ChatCharacter = { _id: string; name: string; description: string; avatar?: string }

export type ChatLine = {
  _id: string
  characters: ChatCharacter[]
  name: string
  createdAt: string
  updatedAt: string
}

export type SortType =
  | 'chat-updated'
  | 'chat-created'
  | 'character-name'
  | 'character-created'
  | 'bot-activity'

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
  if (type === 'chat-updated' || type === 'chat-created') {
    const sorted = allChats.slice().sort(getChatSortFunction(type, direction))
    return [{ char: null, chats: sorted }]
  }

  const groups: ChatGroup[] = []
  const sortedChats = allChats.slice().sort(getChatSortFunction('chat-updated', 'desc'))

  const chars = allChars.slice().map((char) => {
    if (type !== 'bot-activity') return char
    const first = sortedChats.find((c) => c.characters.some((char) => char._id === char._id))
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
  const existing = safeLocalStorage.getItem(CACHE_KEY)
  const defaultCache: ListCache = { sort: { field: 'chat-updated', direction: 'desc' } }

  if (!existing) {
    return defaultCache
  }

  return { ...defaultCache, ...JSON.parse(existing) }
}

export function saveListCache(cache: ListCache) {
  safeLocalStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}
