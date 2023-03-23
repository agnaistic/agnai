import { v4 } from 'uuid'
import { AppSchema, NewBook } from '../../../srv/db/schema'
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

export async function createBook(book: NewBook) {
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

export async function updateBook(bookId: string, update: NewBook) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/memory/${bookId}`, update)
    return res
  }

  const books = local
    .loadItem('memory')
    .map((book) => (book._id === bookId ? { ...book, ...update } : book))
  local.saveBooks(books)

  return local.result({ success: true })
}

export async function removeBook(bookId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/memory/${bookId}`)
    return res
  }

  const books = local.loadItem('memory').filter((book) => book._id !== bookId)
  local.saveBooks(books)

  return local.result({ success: true })
}
