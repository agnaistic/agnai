import { createStore } from './create'
import { AppSchema } from '/srv/db/schema'

export type Tag = string

type TagOption = {
  tag: Tag
  count: number
}

type TagsState = {
  tags: TagOption[]
}

const defaultTags: Tag[] = ['nsfw', 'imported', 'archived']

const initialState: TagsState = {
  tags: defaultTags.map((tag) => ({ tag, count: 0 })),
}

export const tagStore = createStore<TagsState>(
  'tag',
  initialState
)((get, set) => {
  return {
    updateTags(_, characters: AppSchema.Character[]) {
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
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }))

      return { tags }
    },
  }
})
