import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../../db'
import { loggedIn } from '../auth'
import { handle } from '../wrap'
import { AppSchema } from '../../db/schema'
import { FILAMENT_ENABLED, filament } from '../../adapter/luminai'

const router = Router()

const validEntry = {
  name: 'string',
  weight: 'number',
  priority: 'number',
  entry: 'string',
  enabled: 'boolean',
  keywords: ['string'],
} as const

const validBook = {
  name: 'string',
  description: 'string?',
  entries: [validEntry],
} as const

const getUserBooks = handle(async ({ userId }) => {
  const books = await store.memory.getBooks(userId!)
  return { books }
})

const createBook = handle(async ({ body, userId }) => {
  assertValid(validBook, body)

  const newBook = await store.memory.createBook(userId!, body)
  embed(userId, newBook)

  return newBook
})

const updateBook = handle(async ({ body, userId, params }) => {
  const id = params.id
  assertValid(validBook, body)
  await store.memory.updateBook(userId!, id!, body)

  if (FILAMENT_ENABLED) {
    const book = await store.memory.getBook(id)
    embed(userId, book!)
  }

  return { success: true }
})

const removeBook = handle(async ({ userId, params }) => {
  await store.memory.deleteBook(userId, params.id)
  return { success: true }
})

router.get('/', loggedIn, getUserBooks)
router.post('/', loggedIn, createBook)
router.put('/:id', loggedIn, updateBook)
router.delete('/:id', loggedIn, removeBook)

export default router

/**
 * This will only _try_ to perform memory embedding when:
 * - luminai is enabled
 * - and the user has a luminai url configured
 */
async function embed(userId: string, book: AppSchema.MemoryBook) {
  if (!FILAMENT_ENABLED) return

  const user = await store.users.getUser(userId)
  if (!user || !user.luminaiUrl || !book) return

  filament.embedMemory(user, book)
}
