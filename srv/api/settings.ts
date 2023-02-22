import { Router } from 'express'
import { store } from '../db'
import { handle } from './handle'
import { assertValid } from 'frisker'

const router = Router()

router.get(
  '/',
  handle(async () => {
    const settings = await store.settings.get()
    return settings
  })
)

router.post(
  '/',
  handle(async ({ body }) => {
    assertValid(
      {
        koboldUrl: 'string',
        novelApiKey: 'string',
        defaultAdapter: ['kobold', 'chai', 'novel'],
        chaiUrl: 'string',
      },
      body
    )

    const next = await store.settings.save(body)
    return next
  })
)
export default router
