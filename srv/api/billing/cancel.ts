import { StatusError, handle } from '../wrap'
import { store } from '../../db'
import { stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'

export const cancelSubscription = handle(async ({ body, userId }) => {
  const user = await store.users.getUser(userId)
  if (!user?.billing?.subscriptionId) {
    throw new StatusError('No subscription present', 400)
  }

  if (user.billing.status === 'cancelled') {
    throw new StatusError('Subscription already cancelled', 400)
  }

  const result = await stripe.subscriptions.update(user.billing.subscriptionId, {
    cancel_at_period_end: true,
    proration_behavior: 'none',
  })

  if (!result.cancel_at_period_end) {
    throw new StatusError(
      `Subscription change failed - Could not transition to cancel pending`,
      500
    )
  }

  await subsCmd.cancel(userId, {})

  const next = user.billing
  next.cancelling = true

  await store.users.updateUser(userId, { billing: next })
  return { success: true }
})
