import { v4 } from 'uuid'
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

export async function createBook(book: Omit<AppSchema.MemoryBook, '_id' | 'userId' | 'kind'>) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.MemoryBook>(`/memory`, book)
    return res
  }

  const next: AppSchema.MemoryBook = {
    _id: v4(),
    kind: 'memory',
    userId: local.ID,
    ...book,
  }
  const books = local.loadItem('memory').concat(next)
  local.saveBooks(books)

  return local.result(next)
}
