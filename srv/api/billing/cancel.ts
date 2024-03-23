import { StatusError, handle } from '../wrap'
import { store } from '../../db'
import { findValidSubscription, stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'
import Stripe from 'stripe'

export const cancelSubscription = handle(async ({ body, userId }) => {
  const user = await store.users.getUser(userId)
  if (!user?.billing?.subscriptionId) {
    throw new StatusError('No subscription present', 400)
  }

  let alt: Stripe.Subscription | undefined
  let subscriptionId = user.billing.subscriptionId

  if (user.billing.status === 'cancelled') {
    alt = await findValidSubscription(user)
    if (!alt) {
      throw new StatusError('Subscription already cancelled', 400)
    }

    subscriptionId = alt.id
  }

  const result = await stripe.subscriptions.update(subscriptionId, {
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
