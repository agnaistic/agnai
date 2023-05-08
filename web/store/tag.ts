import { createStore } from './create'
import { AppSchema } from '/srv/db/schema'

export type Tag = string

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
      const tagCounts = defaultTags.reduce((acc, tag) => {
        acc[tag] = 0
        return acc
      }, {} as Record<string, number>)

      characters.forEach((c) => {
        if (!c.tags) return
        c.tags.forEach((tag) => {
          if (!tag) return
          if (!tagCounts[tag]) tagCounts[tag] = 0
          tagCounts[tag]++
        })
      })

      const tags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => {
          if (a.tag === 'archived') return 1
          if (b.tag === 'archived') return -1
          if (a.count !== b.count) return b.count - a.count
          return a.tag.localeCompare(b.tag)
        })

      let filter = prev.filter
      let hidden = prev.hidden

      if (!restoredFromCache) {
        restoredFromCache = true
        try {
          const cache = localStorage.getItem('agnai-tag-cache')
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
        localStorage.setItem('agnai-tag-cache', JSON.stringify(next))
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
        localStorage.setItem('agnai-tag-cache', JSON.stringify(next))
      } catch (e) {
        console.warn('Failed to save tags in local storage', e)
      }
      return next
    },
  }
})
