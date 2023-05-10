import { ChubItem } from '../pages/Chub/ChubItem'
import { chubPage } from '../pages/Chub/ChubNavigation'
import { createStore } from './create'

type ChubItem = {
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
  sort: 'Creation Date',
  search: '',
  chars: [],
  books: [],
}

const getSort = () => {
  switch (chubStore().sort) {
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

export async function getChubChars() {
  const res = await fetch(
    `${CHUB_URL}/characters/search?&search=${chubStore().search}&first=${48 * chubPage()}&nsfw=${
      chubStore().nsfw
    }&tags=${chubStore().tags}&exclude_tags=${chubStore().excludeTags}&sort=${getSort()}`
  )
  const json = await res.json()

  chubStore.setState({
    ...chubStore(),
    chars: json.nodes,
  })
}
export async function getChubBooks() {
  const res = await fetch(
    `${CHUB_URL}/lorebooks/search?&search=${chubStore().search}&first=${48 * chubPage()}&nsfw=${
      chubStore().nsfw
    }&tags=${chubStore().tags}&exclude_tags=${chubStore().excludeTags}&sort=${getSort()}`
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
