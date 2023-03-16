import gpt from 'gpt-3-encoder'
import { AppSchema } from '../srv/db/schema'
import { AIAdapter } from './adapters'
import { defaultPresets, getFallbackPreset } from './presets'

type MemoryOpts = {
  chat: AppSchema.Chat
  settings?: AppSchema.UserGenPreset
  book: AppSchema.MemoryBook
  lines: string[]
  message: string
  adapter: AIAdapter
}

type Match = {
  /** The order in which is was found in the book's entry list */
  id: number

  /** The position within the prompt that it was found. Larger means closer to the end */
  index: number

  entry: AppSchema.MemoryEntry

  tokens: number
}

/**
 * When determine the insertion order of an entry:
 * - Highest priority wins
 * - If there is a priority tie, entry that is "most recently referred to" wins
 * - If there is a tie due to using the same keyword, the earliest entry in the book wins
 */

export function getMemoryPrompt({ chat, book, ...opts }: MemoryOpts) {
  if (!book.entries) return

  const settings: Partial<AppSchema.GenSettings> = opts.settings || getFallbackPreset(opts.adapter)
  const depth = settings.memoryDepth || defaultPresets.basic.memoryDepth
  const maxMemory = settings.memoryContextLimit || defaultPresets.basic.memoryContextLimit
  const reveseWeight = settings.memoryReverseWeight ?? defaultPresets.basic.memoryReverseWeight

  if (isNaN(depth) || depth <= 0) return

  const entries: Match[] = []

  let id = 0
  const combinedText = opts.lines.join(' ')

  for (const entry of book.entries) {
    let index = -1
    for (const keyword of entry.keywords) {
      const match = combinedText.lastIndexOf(keyword)
      if (match === -1 || match < index) continue
      index = match
    }

    if (index > -1) {
      const tokens = gpt.encode(entry.entry).length
      entries.push({ index, entry, id: ++id, tokens })
    }
  }

  entries.sort(byPriorityThenIndex)
}

function byPriorityThenIndex(
  { id: lid, index: li, entry: l }: Match,
  { id: rid, index: ri, entry: r }: Match
) {
  if (l.weight !== r.weight) return l.weight > r.weight ? 1 : -1
  if (li !== ri) return li > ri ? 1 : -1
  return lid > rid ? 1 : lid === rid ? 0 : -1
}
