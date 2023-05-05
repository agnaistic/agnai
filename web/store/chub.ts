import { chubOptions } from '../pages/Chub/Chub'
import { ChubChar } from '../pages/Chub/ChubChar'
import { chubPage } from '../pages/Chub/ChubNavigation'
import { createStore } from './create'

export type ChubOptions = {
  nsfw: boolean
  tags: string
  excludeTags: string
  sort: string
  search: string
}

export type ChubItem = {
  name: string
  description: string
  fullPath: string
}

type ChubState = {
  initLoading: boolean
  chars: ChubItem[]
  books: ChubItem[]
  chubOptions: ChubOptions
}

const CHUB_URL = `https://api.characterhub.org/api`

const initState: ChubState = {
  initLoading: true,
  chars: [],
  books: [],
  chubOptions: {
    nsfw: false,
    tags: '',
    excludeTags: '',
    sort: 'Download Count',
    search: '',
  },
}

export const chubStore = createStore<ChubState>(
  'chub',
  initState
)((_) => {
  return {
    async getChubChars() {
      let sort = ''
      switch (chubOptions.sort) {
        case 'Download Count':
          sort = 'download_count'
          break
        case 'ID':
          sort = 'id'
          break
        case 'Rating':
          sort = 'rating'
          break
        case 'Rating Count':
          sort = 'rating_count'
          break
        case 'Last Activity':
          sort = 'last_activity_at'
          break
        case 'Creation Date':
          sort = 'created_at'
          break
        case 'Name':
          sort = 'name'
          break
        case 'Token Count':
          sort = 'n_tokens'
          break
      }

      const res = await fetch(
        `${CHUB_URL}/characters/search?&search=${chubOptions.search}&first=${
          48 * chubPage()
        }&nsfw=${chubOptions.nsfw}&tags=${chubOptions.tags}&exclude_tags=${
          chubOptions.excludeTags
        }&sort=${sort}`
      )
      const json = await res.json()

      return { chars: json.nodes }
    },
    async getChubBooks() {
      let sort = ''
      switch (chubOptions.sort) {
        case 'Download Count':
          sort = 'download_count'
          break
        case 'ID':
          sort = 'id'
          break
        case 'Rating':
          sort = 'rating'
          break
        case 'Rating Count':
          sort = 'rating_count'
          break
        case 'Last Activity':
          sort = 'last_activity_at'
          break
        case 'Creation Date':
          sort = 'created_at'
          break
        case 'Name':
          sort = 'name'
          break
        case 'Token Count':
          sort = 'n_tokens'
          break
      }
      const res = await fetch(
        `${CHUB_URL}/lorebooks/search?&search=${chubOptions.search}&first=${48 * chubPage()}&nsfw=${
          chubOptions.nsfw
        }&tags=${chubOptions.tags}&exclude_tags=${chubOptions.excludeTags}&sort=${sort}`
      )
      const json = await res.json()
      return { books: json.nodes }
    },
  }
})
