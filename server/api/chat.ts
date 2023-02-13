import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { handle } from './handle'

const router = Router()

router.get(
  '/',
  handle(async () => {
    const list = await store.chats.list()
    return list
  })
)

router.get(
  '/:id',
  handle(async ({ params }) => {
    const id = params.id
    const chat = await store.chats.one(id)
    return chat
  })
)

router.post('/:id', async ({ params, body }) => {
  assertValid({ name: 'string' }, body)
  const id = params.id
  const chat = await store.chats.update(id, body.name)
  return chat
})

router.post('/', async ({ body }) => {
  assertValid({ name: 'string' }, body)
  const chat = await store.chats.create(body.name)
  return chat
})

export default router
