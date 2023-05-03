import { v4 } from 'uuid'
import { AppSchema, NewBook } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { localApi } from './storage'

export const memoryApi = {
  getBooks,
  createBook,
  updateBook,
  removeBook,
}

export async function getBooks() {
  if (isLoggedIn()) {
    const res = await api.get<{ books: AppSchema.MemoryBook[] }>('/memory')
    return res
  }

  const books = localApi.loadItem('memory')
  return localApi.result({ books })
}

export async function createBook(book: NewBook) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.MemoryBook>(`/memory`, book)
    return res
  }

  const next: AppSchema.MemoryBook = {
    _id: v4(),
    kind: 'memory',
    userId: localApi.ID,
    ...book,
  }
  const books = localApi.loadItem('memory').concat(next)
  localApi.saveBooks(books)

  return localApi.result(next)
}

export async function updateBook(bookId: string, update: NewBook) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/memory/${bookId}`, update)
    return res
  }

  const books = localApi
    .loadItem('memory')
    .map((book) => (book._id === bookId ? { ...book, ...update } : book))
  localApi.saveBooks(books)

  return localApi.result({ success: true })
}

export async function removeBook(bookId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/memory/${bookId}`)
    return res
  }

  const books = localApi.loadItem('memory').filter((book) => book._id !== bookId)
  localApi.saveBooks(books)

  return localApi.result({ success: true })
}
