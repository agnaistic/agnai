import { TokenCounter, AppSchema } from './types'
import { defaultPresets } from './presets'
import { BOT_REPLACE, SELF_REPLACE } from './prompt'

export const BUNDLED_CHARACTER_BOOK_ID = '__bundled__characterbook__'

export type MemoryOpts = {
  user: AppSchema.User
  chat: AppSchema.Chat
  char: AppSchema.Character
  settings?: Partial<AppSchema.UserGenPreset>
  books?: Array<AppSchema.MemoryBook | undefined>
  lines: string[]
  impersonate?: AppSchema.Character
  members: AppSchema.Profile[]
}

export type MemoryPrompt = {
  prompt: string
  entries: Match[]
  tokens: number
}

type Match = {
  /** The age of the message in which the match was found, counting from the last message up. */
  messageAge: number
  entry: AppSchema.MemoryEntry
  tokens: number
  text: string
}

type MemoryPromptContext = {
  bot: string
  sender: string
  depth: number
  budget: number
  encoder: TokenCounter
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

export async function buildMemoryPrompt(opts: MemoryOpts, encoder: TokenCounter): Promise<string> {
  const ctx = getMemoryPromptContext(opts, encoder)
  if (!ctx) return ''

  const entries = getEnabledEntriesFromBooks(opts.books)

  const matches = await findAllMatches(entries, opts.lines, ctx)
  matches.sort(byPriorityThenAge)

  const allowed = await getMatchesWithinBudget(matches, ctx)
  allowed.sort(byWeightThenAge)

  let prompt = allowed
    .map(({ text }) => text)
    .reverse()
    .join('')

  // do not append extra '\n' at the end
  if (prompt.endsWith('\n')) prompt = prompt.slice(0, -'\n'.length)

  return prompt
}

function getMemoryPromptContext(
  opts: MemoryOpts,
  encoder: TokenCounter
): MemoryPromptContext | undefined {
  const depth = opts.settings?.memoryDepth || defaultPresets.basic.memoryDepth || Infinity
  if (isNaN(depth) || depth <= 0) return

  const budget = opts.settings?.memoryContextLimit || defaultPresets.basic.memoryContextLimit

  const bot = opts.char.name
  const sender =
    opts.impersonate?.name ||
    opts.members.find((mem) => mem.userId === opts.chat.userId)?.handle ||
    'You'

  return {
    bot,
    sender,
    depth,
    budget,
    encoder,
  }
}

function getEnabledEntriesFromBooks(books: (AppSchema.MemoryBook | undefined)[] | undefined) {
  if (!books) return []

  const entries = []
  for (const book of books) {
    if (!book) continue

    for (const entry of book.entries) {
      if (!entry.enabled) continue
      entries.push(entry)
    }
  }
  return entries
}

async function findAllMatches(
  entries: AppSchema.MemoryEntry[],
  lines: string[],
  ctx: MemoryPromptContext
) {
  const matches: Match[] = []
  const history = lines.slice(-ctx.depth).reverse() // oldest messages last

  for (const entry of entries) {
    const match = await findMatchWithLowestAge(entry, history, ctx)
    if (match) matches.push(match)
  }
  return matches
}

async function findMatchWithLowestAge(
  entry: AppSchema.MemoryEntry,
  history: string[],
  ctx: MemoryPromptContext
): Promise<Match | undefined> {
  let lowestAge = Infinity

  for (const keyword of entry.keywords) {
    const match = findFirstMatchingLineNumber(keyword, history)
    if (match === undefined) continue

    lowestAge = Math.min(lowestAge, match)
  }

  if (lowestAge === Infinity) return

  const text = entry.entry
    .replace(BOT_REPLACE, ctx.bot)
    .replace(SELF_REPLACE, ctx.sender)
    .concat('\n') // append the newline now for the token count to match

  return {
    messageAge: lowestAge,
    entry,
    tokens: await ctx.encoder(text),
    text,
  }
}

function findFirstMatchingLineNumber(keyword: string, history: string[]) {
  const searchPattern = createRegexForKeyword(keyword)

  let lineNumber = 0
  for (const line of history) {
    if (searchPattern.test(line)) return lineNumber
    lineNumber++
  }
}

function createRegexForKeyword(keyword: string) {
  const pattern = keyword
    .trim()
    .replace(/[\\^$+.()|[\]{}_]/g, '') // escape all special chars except * and ?
    .replace(/\*/g, '\\w*') // enable searching by *
    .replace(/\?/g, '\\w') // enable searching by ?

  return new RegExp(`\\b(${pattern})\\b`, 'giu')
}

async function getMatchesWithinBudget(matches: Match[], ctx: MemoryPromptContext) {
  let allowed: Match[] = []
  let tokensUsed = 0

  for (const match of matches) {
    if (tokensUsed + match.tokens >= ctx.budget) break

    allowed.push(match)
    tokensUsed += match.tokens
  }
  return allowed
}

function byPriorityThenAge(
  { messageAge: lAge, entry: l }: Match,
  { messageAge: rAge, entry: r }: Match
) {
  // higher priority first
  if (l.priority !== r.priority) return l.priority > r.priority ? -1 : 1
  // lower age first
  if (lAge !== rAge) return lAge < rAge ? -1 : 1
  return 0
}

function byWeightThenAge(
  { messageAge: lAge, entry: l }: Match,
  { messageAge: rAge, entry: r }: Match
) {
  // higher weight first
  if (l.weight !== r.weight) return l.weight > r.weight ? -1 : 1
  // lower age first
  if (lAge !== rAge) return lAge < rAge ? -1 : 1
  return 0
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
