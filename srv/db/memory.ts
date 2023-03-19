import { db } from './client'

export async function getBooks(userId: string) {
  const books = await db('memory').find({ userId }).toArray()
  return books
}
