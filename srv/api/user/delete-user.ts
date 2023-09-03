import { handle } from '../wrap'
import { store } from '/srv/db'

export const deleteUserAccount = handle(async ({ userId }) => {
  await store.users.deleteUserAccount(userId)
  return { success: true }
})
