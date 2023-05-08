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

export const tagStore = createStore<TagsState>(
  'tag',
  initialState
)((get, set) => {
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

      const filter = prev.filter.filter((tag) => tags.some((t) => t.tag === tag))
      const hidden = prev.hidden.filter((tag) => tags.some((t) => t.tag === tag))

      return { tags, filter, hidden }
    },
    setDefault() {
      return { filter: [], hidden: defaultHidden }
    },
    toggle(prev, tag: Tag) {
      if (prev.filter.includes(tag)) {
        return { filter: prev.filter.filter((t) => t !== tag), hidden: prev.hidden.concat(tag) }
      } else if (prev.hidden.includes(tag)) {
        return { hidden: prev.hidden.filter((t) => t !== tag) }
      } else {
        return { filter: prev.filter.concat(tag) }
      }
    },
  }
})
