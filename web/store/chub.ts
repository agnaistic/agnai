import { ChubItem } from '../pages/Chub/ChubItem'
import { createStore } from './create'

type ChubItem = {
  name: string
  description: string
  fullPath: string
  tagline?: string
}

type ChubState = {
  nsfw: boolean
  tags: string
  excludeTags: string
  sort: string
  search: string
  chars: ChubItem[]
  books: ChubItem[]
  page: number
  booksLoading: boolean
  charsLoading: boolean
}

export const CHUB_URL = `https://api.chub.ai/api`

const initState: ChubState = {
  nsfw: false,
  tags: '',
  excludeTags: '',
  sort: 'Creation Date',
  search: '',
  chars: [],
  books: [],
  page: 1,
  booksLoading: false,
  charsLoading: false,
}

export const chubStore = createStore<ChubState>(
  'chub',
  initState
)((_) => {
  return {
    setSearch(_, query: string) {
      return { search: query }
    },
    setNSFW(_, nsfw: boolean) {
      return { nsfw }
    },
    setTags(_, tags: string) {
      return { tags }
    },
    setExcludeTags(_, tags: string) {
      return { excludeTags: tags }
    },
    setSort(_, sort: string) {
      return { sort }
    },
    setPage(_, page: number) {
      return { page }
    },
    async *getBooks(state) {
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
