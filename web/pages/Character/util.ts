import { toArray } from '/common/util'
import { AppSchema } from '/common/types'
import { storage } from '/web/shared/util'
import { NewCharacter } from '/web/store'

const CACHE_KEY = 'agnai-chatlist-cache'

export type ChatCharacter = { _id: string; name: string; description: string; avatar?: string }

export type ChatLine = {
  _id: string
  characters: ChatCharacter[]
  name: string
  createdAt: string
  updatedAt: string
  characterId: string
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

export function toGeneratedCharacter(response: string, description: string): NewCharacter {
  const lines = response.split('\n')
  const name = extract(lines, 'FirstName')

  const re = new RegExp(name, 'g')

  const char: NewCharacter = {
    originalAvatar: undefined,
    description,
    appearance: extract(lines, 'Appearance'),
    scenario: extract(lines, 'Scenario').replace(re, '{{char}}'),
    greeting: extract(lines, 'Greeting').replace(re, '{{char}}'),
    name,
    sampleChat: extract(lines, 'ExampleSpeech1', 'ExampleSpeech2', 'ExampleSpeech3')
      .split('\n')
      .map((line) => `{{char}}: ${line}`)
      .join('\n'),
    persona: {
      kind: 'wpp',
      attributes: {
        personality: extract(lines, 'Personality').replace(re, '{{char}}').split(', '),
        behaviours: extract(lines, 'Behaviours', 'Behaviors').replace(re, '{{char}}').split(', '),
        description: toArray(extract(lines, 'Description').replace(re, '{{char}}')),
        speech: extract(lines, 'Speech').replace(re, '{{char}}').split(', '),
      },
    },
  }

  return char
}

function extract(from: string[], ...match: string[]) {
  const matches: string[] = []
  for (const search of match) {
    for (const line of from) {
      const start = line.indexOf(`${search}:`)
      if (start === -1) continue

      const text = line.slice(start + search.length + 1).trim()
      if (match.length === 1) return text
      matches.push(text)
    }
  }

  return matches.join('\n')
}

export function toCharacterMap(bots: AppSchema.Character[]) {
  const map = bots.reduce<Record<string, AppSchema.Character>>(
    (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
    {}
  )
  return map
}
