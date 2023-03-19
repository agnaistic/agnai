import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'

type NewBook = Omit<AppSchema.MemoryBook, 'userId' | '_id' | 'kind'>

export async function getBooks(userId: string) {
  const books = await db('memory').find({ userId }).toArray()
  return books
}

export async function createBook(userId: string, book: NewBook) {
  const id = v4()

  const newBook: AppSchema.MemoryBook = {
    _id: v4(),
    kind: 'memory',
    userId,
    ...book,
  }

  await db('memory').insertOne(newBook)
  return newBook
}

export async function updateBook(userId: string, bookId: string, book: NewBook) {
  await db('memory').updateOne(
    { _id: bookId, userId },
    {
      $set: {
        name: book.name,
        entries: book.entries,
      },
    }
  )
}

export async function deleteBook(userId: string, bookId: string) {
  await db('memory').deleteOne({ _id: bookId, userId })
}
