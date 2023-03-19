import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { local } from './storage'

export async function getBooks() {
  if (isLoggedIn()) {
    const res = await api.get<{ books: AppSchema.MemoryBook[] }>('/memory')
    return res
  }

  const books = local.loadItem('memory')
  return local.result({ books })
}
