import { storage } from '../shared/util'
import { createStore } from './create'
import { AppSchema } from '/common/types'

export type Tag = string

const TAG_CACHE_KEY = 'agnai-tag-cache'

type TagOption = {
  tag: Tag
  count: number
}

type TagsState = {
  tags: TagOption[]
  filter: Tag[]
  hidden: Tag[]
}

const defaultTags: Tag[] = ['nsfw', 'imported', 'archived']
const defaultHidden: Tag[] = ['archived']

const initialState: TagsState = {
  tags: [
    { tag: 'nsfw', count: 0 },
    { tag: 'imported', count: 0 },
    { tag: 'archived', count: 0 },
  ],
  filter: [],
  hidden: defaultHidden,
}

let restoredFromCache = false

export const tagStore = createStore<TagsState>(
  'tag',
  initialState
)(() => {
  return {
    updateTags(prev, characters: AppSchema.Character[]) {
      const tagCounts = defaultTags.reduce(toEmptyTagCounts, {})

      for (const char of characters) {
        if (!char.tags) continue

        for (const tag of char.tags) {
          if (!tag) continue
          if (!tagCounts[tag]) tagCounts[tag] = 0
          tagCounts[tag]++
        }
      }

      const tags = Object.entries(tagCounts).map(toTagOption).sort(sortTags)

      let filter = prev.filter
      let hidden = prev.hidden

      if (!restoredFromCache) {
        restoredFromCache = true
        try {
          const cache = storage.localGetItem(TAG_CACHE_KEY)
          if (cache) {
            const { filter: f, hidden: h } = JSON.parse(cache)
            filter = f
            hidden = h
          }
        } catch (e) {
          console.warn('Failed to restore tags from local storage', e)
        }
      }

      return { tags, filter, hidden }
    },
    setDefault() {
      const next = { filter: [], hidden: defaultHidden }
      try {
        storage.localSetItem(TAG_CACHE_KEY, JSON.stringify(next))
      } catch (e) {
        console.warn('Failed to save tags in local storage', e)
      }
      return next
    },
    toggle(prev, tag: Tag) {
      let next: Partial<TagsState>
      if (prev.filter.includes(tag)) {
        next = { filter: prev.filter.filter((t) => t !== tag), hidden: prev.hidden.concat(tag) }
      } else if (prev.hidden.includes(tag)) {
        next = { filter: prev.filter, hidden: prev.hidden.filter((t) => t !== tag) }
      } else {
        next = { filter: prev.filter.concat(tag), hidden: prev.hidden }
      }
      try {
        storage.localSetItem(TAG_CACHE_KEY, JSON.stringify(next))
      } catch (e) {
        console.warn('Failed to save tags in local storage', e)
      }
      return next
    },
  }
})

function toTagOption([tag, count]: [string, number]) {
  return { tag, count }
}

function toEmptyTagCounts(acc: Record<string, number>, tag: string) {
  return Object.assign(acc, { [tag]: 0 })
}

function sortTags(a: TagOption, b: TagOption) {
  if (a.tag === 'archived') return 1
  if (b.tag === 'archived') return -1
  if (a.count !== b.count) return b.count - a.count
  return a.tag.localeCompare(b.tag)
}
