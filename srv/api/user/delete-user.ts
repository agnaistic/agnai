import { findValidSubscription } from '../billing/stripe'
import { StatusError, handle } from '../wrap'
import { store } from '/srv/db'

export const deleteUserAccount = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId)
  if (user?.billing?.status === 'active') {
    const sub = await findValidSubscription(user)

    if (sub && !sub.cancel_at) {
      throw new StatusError(
        `You currently have an active subscription: Cancel your subscription first`,
        400
      )
    }
  }

  await store.users.deleteUserAccount(userId)
  return { success: true }
})
