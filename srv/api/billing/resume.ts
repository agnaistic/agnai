import { StatusError, handle } from '../wrap'
import { store } from '../../db'
import { stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'

export const resumeSubscription = handle(async ({ body, userId }) => {
  const user = await store.users.getUser(userId)
  if (!user?.billing?.subscriptionId || !user.sub?.tierId) {
    throw new StatusError('No subscription present', 400)
  }

  const previous = await stripe.subscriptions.retrieve(user.billing.subscriptionId)
  if (!previous) {
    throw new StatusError(`Cannot resume subscription: Subscription not found`, 400)
  }

  if (!previous.cancel_at || !previous.cancel_at_period_end) {
    throw new StatusError(`Cannot resume subscription - No longer in cancelation period`, 400)
  }

  const cancelAt = new Date(previous.cancel_at * 1000)
  if (cancelAt.valueOf() < Date.now()) {
    throw new StatusError(`Cannot resume subscription - No longer in cancelation period`, 400)
  }

  const result = await stripe.subscriptions.update(user.billing.subscriptionId, {
    cancel_at_period_end: false,
  })

  if (result.status !== 'active') {
    throw new StatusError(`Subscription change failed. Transitioned to "${result.status}"`, 500)
  }

  const next = user.billing
  next.cancelling = false

  await subsCmd.resume(userId, {})
  await store.users.updateUser(userId, { billing: next })

  return { success: true }
})
