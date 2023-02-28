import { assertValid } from 'frisker'
import { store } from '../../db'
import { handle } from '../wrap'

export const deleteMessages = handle(async ({ body }) => {
  assertValid({ ids: ['string'] }, body)
  await store.chats.deleteMessages(body.ids)
  return { success: true }
})
