import { Router } from 'express'
import { assertValid } from '/common/valid'
import { store } from '../../db'
import { loggedIn } from '../auth'
import { handle } from '../wrap'

const router = Router()

const validEntry = {
  name: 'string',
  weight: 'number',
  priority: 'number',
  entry: 'string',
  enabled: 'boolean',
  keywords: ['string'],
} as const

export const validBook = {
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

  return newBook
})

const updateBook = handle(async ({ body, userId, params }) => {
  const id = params.id
  assertValid(validBook, body)
  await store.memory.updateBook(userId!, id!, body)

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
