import { ChubItem as ChubEntity } from '../pages/Chub/ChubItem'
import { getStoredValue, setStoredValue } from '../shared/hooks'
import { createStore } from './create'

export type ChubEntity = {
  id: number
  name: string
  description: string
  fullPath: string
  tagline?: string
  topics: string[]

  nChats: number
  nMessages: number
  rating: number
  ratingCount: number
  starCount: number
}

type ChubState = {
  view: 'chars' | 'books'
  nsfw: boolean
  tags: string
  excludeTags: string
  sort: string
  search: string
  chars: ChubEntity[]
  books: ChubEntity[]
  page: number
  booksLoading: boolean
  charsLoading: boolean
  officialTags: { ttl: number; tags: ChubTag[] }
}

type ChubTag = {
  id: number
  name: string
  non_private_projects_count: number
  followers_count: number
  title: string
}

export const CHUB_URL = `https://api.chub.ai`

const initState: ChubState = {
  view: 'chars',
  nsfw: getStoredValue('chub-nsfw', false),
  tags: '',
  excludeTags: '',
  sort: getStoredValue('chub-sort', 'Creation Date'),
  search: '',
  chars: [],
  books: [],
  page: 1,
  booksLoading: false,
  charsLoading: false,
  officialTags: getStoredValue('chub-tags', { ttl: 0, tags: [] }),
}

export const chubStore = createStore<ChubState>(
  'chub',
  initState
)((_, setState) => {
  return {
    async initTags({ officialTags: prev }) {
      if ('ttl' in prev && 'tags' in prev && prev.tags.length > 0) {
        if (Date.now() < prev.ttl) return
      }

      const ttl = Date.now() + 60000 * 60 * 24

      const result = await fetch('https://api.chub.ai/tags', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          nsfl: false,
          nsfw: true,
          order_by: null,
          sort: null,
          offset: 0,
          search: '',
        }),
      })
        .then((res) => res.json())
        .catch(() => null)

      if (!result) return

      setStoredValue('chub-tags', { ttl, tags: result.tags })
      return { officialTags: { ttl, tags: result.tags } }
    },

    setSearch(_, query: string) {
      return { search: query }
    },
    setNSFW(_, nsfw: boolean) {
      setStoredValue('chub-nsfw', nsfw)
      return { nsfw }
    },
    setTags(_, tags: string) {
      return { tags }
    },
    setExcludeTags(_, tags: string) {
      return { excludeTags: tags }
    },
    setSort(_, sort: string) {
      setStoredValue('chub-sort', sort)
      return { sort }
    },
    setPage(_, page: number) {
      return { page }
    },
    async *getEntities({ view }, type?: 'books' | 'chars') {
      if (type) {
        yield { view: type }
      }

      let curr = type ?? view
      if (curr === 'books') chubStore.getBooks()
      else chubStore.getChars()
    },
    async *getBooks(state) {
      if (state.booksLoading) return

      const { nsfw, tags, sort, excludeTags, search, page } = state
      yield { booksLoading: true }
      const res = await fetch(
        `${CHUB_URL}/search?&search=${search}&first=48&page=${page}&nsfw=${nsfw}&tags=${tags}&exclude_tags=${excludeTags}&sort=${getSort(
          sort
        )}&namespace=lorebooks`
      )
      yield { booksLoading: false }

      const json = await res.json()
      yield { books: json.data?.nodes }
    },
    async *getChars(state) {
      if (state.charsLoading) return

      const { search, page, tags, excludeTags, nsfw, sort } = state
      yield { charsLoading: true }
      const res = await fetch(
        `${CHUB_URL}/search?&search=${search}&first=48&page=${page}&nsfw=${nsfw}&tags=${tags}&exclude_tags=${excludeTags}&sort=${getSort(
          sort
        )}`
      )
      yield { charsLoading: false }

      const json = await res.json()
      yield { chars: json.data?.nodes }
    },
  }
})

export function createOnEnter(callback: Function) {
  return (ev: KeyboardEvent) => {
    if (ev.key !== 'Enter') return
    callback()
  }
}

function getSort(sort: string) {
  switch (sort) {
    case 'Download Count':
      return 'download_count'
    case 'ID':
      return 'id'
    case 'Rating':
      return 'rating'
    case 'Rating Count':
      return 'rating_count'
    case 'Last Activity':
      return 'last_activity_at'
    case 'Creation Date':
      return 'created_at'
    case 'Name':
      return 'name'
    case 'Token Count':
      return 'n_tokens'
  }
}
