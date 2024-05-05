import { StatusError, handle } from '../wrap'
import { store } from '../../db'
import { findValidSubscription, stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'

export const cancelSubscription = handle(async ({ body, userId }) => {
  const user = await store.users.getUser(userId)
  if (!user?.billing?.subscriptionId) {
    throw new StatusError('No subscription present', 400)
  }

  const sub = await findValidSubscription(user)
  if (!sub) {
    throw new StatusError('Subscription already cancelled', 400)
  }

  const result = await stripe.subscriptions.update(sub.id, {
    cancel_at_period_end: true,
    proration_behavior: 'none',
  })

  if (!result.cancel_at_period_end) {
    throw new StatusError(`Subscription change failed - Could not transition to cancelled`, 500)
  }

  await subsCmd.cancel(userId, {})

  const next = user.billing
  next.cancelling = true

  await store.users.updateUser(userId, { billing: next })
  return { success: true }
})
