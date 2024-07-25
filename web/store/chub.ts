import { ChubItem as ChubEntity } from '../pages/Chub/ChubItem'
import { getStoredValue, setStoredValue } from '../shared/hooks'
import { createStore } from './create'

export type ChubEntity = {
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
  officialTags: ChubTag[]
}

type ChubTag = {
  id: number
  name: string
  non_private_projects_count: number
  followers_count: number
  title: string
}

export const CHUB_URL = `https://api.chub.ai/api`

const initState: ChubState = {
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
  officialTags: getStoredValue('chub-tags', []),
}

export const chubStore = createStore<ChubState>(
  'chub',
  initState
)((_, setState) => {
  fetch('https://api.chub.ai/tags')
    .then((res) => res.json())
    .then((result) => {
      setStoredValue('chub-tags', result.tags)
      setState({ officialTags: result.tags })
    })
    .catch(() => null)

  return {
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
    async *getBooks(state) {
      if (state.booksLoading) return

      const { nsfw, tags, sort, excludeTags, search, page } = state
      yield { booksLoading: true }
      const res = await fetch(
        `${CHUB_URL}/lorebooks/search?&search=${search}&first=${
          48 * page
        }&nsfw=${nsfw}&tags=${tags}&exclude_tags=${excludeTags}&sort=${getSort(sort)}`
      )
      yield { booksLoading: false }

      const json = await res.json()
      yield { books: json.nodes }
    },
    async *getChars(state) {
      if (state.charsLoading) return

      const { search, page, tags, excludeTags, nsfw, sort } = state
      yield { charsLoading: true }
      const res = await fetch(
        `${CHUB_URL}/characters/search?&search=${search}&first=${
          48 * page
        }&nsfw=${nsfw}&tags=${tags}&exclude_tags=${excludeTags}&sort=${getSort(sort)}`
      )
      yield { charsLoading: false }

      const json = await res.json()
      yield { chars: json.nodes }
    },
  }
})

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
