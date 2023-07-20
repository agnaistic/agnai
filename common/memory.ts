import { AppSchema } from './types/schema'
import { defaultPresets } from './presets'
import { BOT_REPLACE, SELF_REPLACE } from './prompt'
import { Encoder } from './tokenize'

export const BUNDLED_CHARACTER_BOOK_ID = '__bundled__characterbook__'

export type MemoryOpts = {
  user: AppSchema.User
  chat: AppSchema.Chat
  char: AppSchema.Character
  settings?: Partial<AppSchema.UserGenPreset>
  books?: Array<AppSchema.MemoryBook | undefined>
  lines: string[]
  members: AppSchema.Profile[]
}

export type MemoryPrompt = {
  prompt: string
  entries: Match[]
  tokens: number
}

type Match = {
  /** The order in which is was found in the book's entry list */
  id: number

  /** The position within the prompt that it was found. Larger means closer to the end */
  index: number
  entry: AppSchema.MemoryEntry
  tokens: number
  text: string
}

export type CharacterBook = {
  name?: string
  description?: string
  scan_depth?: number /** agnai: "Memory: Chat History Depth" */
  token_budget?: number /** agnai: "Memory: Context Limit" */
  recursive_scanning?: boolean /** no agnai equivalent. whether entry content can trigger other entries */
  extensions: Record<string, any>
  entries: Array<{
    keys: Array<string>
    content: string
    extensions: Record<string, any>
    enabled: boolean
    insertion_order: number /** if two entries inserted, lower "insertion order" = inserted higher */
    case_sensitive?: boolean

    // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
    name?: string /** not used in prompt engineering */
    priority?: number /** if token budget reached, lower priority value = discarded first */

    // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
    id?: number /** not used in prompt engineering */
    comment?: string /** not used in prompt engineering */
    selective?: boolean /** if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry */
    secondary_keys?: Array<string> /** see field `selective`. ignored if selective == false */
    constant?: boolean /** if true, always inserted in the prompt (within budget limit) */
    position?:
      | 'before_char'
      | 'after_char' /** whether the entry is placed before or after the character defs */
  }>
}

type CharacterBookEntry = CharacterBook['entries'][number]

/**
 * When determine the insertion order of an entry:
 * - Highest priority wins
 * - If there is a priority tie, entry that is "most recently referred to" wins
 * - If there is a tie due to using the same keyword, the earliest entry in the book wins
 */

export const MEMORY_PREFIX = 'Facts: '

export function buildMemoryPrompt(opts: MemoryOpts, encoder: Encoder): MemoryPrompt | undefined {
  const { chat, settings, members, char, lines, books } = opts

  if (!books || !books.length) return
  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const depth = settings?.memoryDepth || defaultPresets.basic.memoryDepth || Infinity
  const memoryBudget = settings?.memoryContextLimit || defaultPresets.basic.memoryContextLimit
  // const reveseWeight = settings?.memoryReverseWeight ?? defaultPresets.basic.memoryReverseWeight

  if (isNaN(depth) || depth <= 0) return

  const finalPrompts: string[] = []
  const finalEntries: Match[] = []
  let finalTokens = encoder(MEMORY_PREFIX)

  for (const book of books) {
    if (!book) continue

    const matches: Match[] = []

    let id = 0
    const combinedText = lines.slice().reverse().slice(0, depth).join(' ').toLowerCase()
    const reversed = prep(combinedText)

    for (const entry of book.entries) {
      if (!entry.enabled) continue

      let index = -1
      for (const keyword of entry.keywords) {
        // const partial = `(${prep(keyword)})`
        const txt = `\\b(${prep(keyword)})\\b`
        const re = new RegExp(txt, 'gi')
        const result = re.exec(reversed)
        if (index === -1 && result !== null) {
          index = result.index
        }
      }

      if (index > -1) {
        const text = entry.entry.replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, sender)
        const tokens = encoder(text)
        matches.push({ index, entry, id: ++id, tokens, text })
      }
    }

    matches.sort(byPriorityThenIndex)

    const entries = matches.reduce(
      (prev, curr) => {
        if (prev.budget >= memoryBudget) return prev
        if (prev.budget + curr.tokens > memoryBudget) return prev

        prev.budget += curr.tokens
        prev.list.push(curr)
        return prev
      },
      { list: [] as Match[], budget: finalTokens }
    )

    const prompt = entries.list
      .map(({ text }) => text)
      .reverse()
      .join('\n')

    finalPrompts.push(prompt)
    finalEntries.push(...entries.list)
    finalTokens += entries.budget
  }

  return {
    prompt: finalPrompts.join('\n'),
    entries: finalEntries, // entries.list,
    tokens: finalTokens, // entries.budget,
  }
}

function byPriorityThenIndex(
  { id: lid, index: li, entry: l }: Match,
  { id: rid, index: ri, entry: r }: Match
) {
  if (l.weight !== r.weight) return l.weight < r.weight ? 1 : -1
  if (li !== ri) return li > ri ? -1 : 1
  return lid > rid ? 1 : lid === rid ? 0 : -1
}

function prep(str: string, safe?: boolean) {
  let next = ''
  for (let i = str.length - 1; i >= 0; i--) next += str[i]
  if (!safe) return next
  return next.toLowerCase().replace(/\-/g, '\\-')
}

export function characterBookToNative(cb: CharacterBook): AppSchema.MemoryBook {
  return {
    kind: 'memory',
    _id: BUNDLED_CHARACTER_BOOK_ID,
    name: cb.name ?? 'Character book',
    description: cb.description ?? '',
    userId: 'characterBook',
    entries: cb.entries.map(memoryEntryToNative),

    // currently unsupported V2 fields which are here so that we don't destroy them
    scanDepth: cb.scan_depth,
    tokenBudget: cb.token_budget,
    recursiveScanning: cb.recursive_scanning,
    extensions: cb.extensions,
  }
}

export function nativeToCharacterBook(memory: AppSchema.MemoryBook): CharacterBook {
  return {
    name: memory.name,
    description: memory.description,
    entries: memory.entries.map(nativeToMemoryEntry),

    // currently unsupported V2 fields which are here so that we don't destroy them
    extensions: memory.extensions ?? {},
    scan_depth: memory.scanDepth,
    token_budget: memory.tokenBudget,
    recursive_scanning: memory.recursiveScanning,
  }
}

function memoryEntryToNative(entry: CharacterBookEntry): AppSchema.MemoryEntry {
  return {
    name: entry.name ?? 'Unnamed',
    entry: entry.content,
    keywords: entry.keys,
    priority: entry.priority ?? 100,
    weight: entry.insertion_order ?? 100,
    enabled: entry.enabled,

    // currently unsupported V2 fields which are here so that we don't destroy them
    id: entry.id,
    comment: entry.comment,
    selective: entry.selective,
    secondaryKeys: entry.secondary_keys,
    constant: entry.constant,
    position: entry.position,
  }
}

function nativeToMemoryEntry(memoryEntry: AppSchema.MemoryEntry): CharacterBookEntry {
  return {
    keys: memoryEntry.keywords,
    content: memoryEntry.entry,
    extensions: {},
    enabled: memoryEntry.enabled,
    insertion_order: memoryEntry.weight,
    name: memoryEntry.name,
    priority: memoryEntry.priority,

    // currently unsupported V2 fields which are here so that we don't destroy them
    id: memoryEntry.id,
    comment: memoryEntry.comment,
    selective: memoryEntry.selective,
    secondary_keys: memoryEntry.secondaryKeys,
    constant: memoryEntry.constant,
    position: memoryEntry.position,
  }
}

export const emptyEntry = (): AppSchema.MemoryEntry => ({
  name: '',
  entry: '',
  keywords: [],
  priority: 0,
  weight: 0,
  enabled: true,
})

export const emptyBook = (): AppSchema.MemoryBook => ({
  _id: '',
  name: '',
  description: '',
  entries: [],
  kind: 'memory',
  userId: '',
})

export const emptyBookWithEmptyEntry = (): AppSchema.MemoryBook => ({
  ...emptyBook(),
  entries: [{ ...emptyEntry(), name: 'New Entry' }],
})
