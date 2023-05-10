import { ChubItem } from '../pages/Chub/ChubItem'
import { chubPage } from '../pages/Chub/ChubNavigation'
import { createStore } from './create'

export type ChubItem = {
  name: string
  description: string
  fullPath: string
}

type ChubState = {
  nsfw: boolean
  tags: string
  excludeTags: string
  sort: string
  search: string
  chars: ChubItem[]
  books: ChubItem[]
}

export const CHUB_URL = `https://api.characterhub.org/api`

const initState: ChubState = {
  nsfw: false,
  tags: '',
  excludeTags: '',
  sort: 'Download Count',
  search: '',
  chars: [],
  books: [],
}

export async function getChubChars() {
  let sort = ''
  switch (chubStore().sort) {
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
    `${CHUB_URL}/characters/search?&search=${chubStore().search}&first=${48 * chubPage()}&nsfw=${
      chubStore().nsfw
    }&tags=${chubStore().tags}&exclude_tags=${chubStore().excludeTags}&sort=${sort}`
  )
  const json = await res.json()

  chubStore.setState({
    ...chubStore(),
    chars: json.nodes,
  })
}
export async function getChubBooks() {
  let sort = ''

  switch (chubStore().sort) {
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
    `${CHUB_URL}/lorebooks/search?&search=${chubStore().search}&first=${48 * chubPage()}&nsfw=${
      chubStore().nsfw
    }&tags=${chubStore().tags}&exclude_tags=${chubStore().excludeTags}&sort=${sort}`
  )
  const json = await res.json()
  chubStore.setState({
    ...chubStore(),
    books: json.nodes,
  })
}

export const chubStore = createStore<ChubState>(
  'chub',
  initState
)((_) => {
  return {
    async setSearch(_, query: string) {
      chubStore.setState({
        ...chubStore(),
        search: query,
      })
    },
    async setNSFW(_, nsfw: boolean) {
      chubStore.setState({
        ...chubStore(),
        nsfw: nsfw,
      })
    },
    async setTags(_, tags: string) {
      chubStore.setState({
        ...chubStore(),
        tags: tags,
      })
    },
    async setExcludeTags(_, tags: string) {
      chubStore.setState({
        ...chubStore(),
        excludeTags: tags,
      })
    },
    async setSort(_, sort: string) {
      chubStore.setState({
        ...chubStore(),
        sort: sort,
      })
    },
  }
})
