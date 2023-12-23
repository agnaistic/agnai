import Stripe from 'stripe'
import { config } from '/srv/config'
import { AppSchema } from '/common/types'
import { logger } from '/srv/logger'
import { store } from '/srv/db'
import { getCachedTiers } from '/srv/db/subscriptions'
import { domain } from '/srv/domains'

export const stripe = new Stripe(config.billing.private, { apiVersion: '2023-08-16' })

export async function resyncSubscription(user: AppSchema.User) {
  if (!user.billing) return

  const subscription = await stripe.subscriptions
    .retrieve(user.billing.subscriptionId, { expand: ['plan'] })
    .catch((err) => ({ err }))

  if ('err' in subscription) {
    logger.error({ err: subscription.err }, 'Subscription information could not be retrieved')
    return new Error(
      `Could not retrieve subscription information - Please try again or contact support`
    )
  }

  const plan: Stripe.Plan | undefined = (subscription as any).plan

  const allTiers = getCachedTiers()

  const state = await domain.subscription.getAggregate(user._id)

  const predowngradeId = state.state === 'active' && state.downgrade ? state.tierId : undefined

  /**
   * If a downgrade is in process, ensure we use the pre-downgrade tier until it comes into effect
   */
  const expectedTier = allTiers.find((t) => {
    if (predowngradeId) return t._id === predowngradeId
    return !!plan && t.productId === plan.product
  })

  if (!expectedTier) {
    logger.error(
      { customerId: user.billing.customerId, plan },
      'Subscription missing plan information'
    )
    return new Error(
      `Internal server error: Could not locate your subscription plan - Contact support`
    )
  }

  const now = Date.now()

  const renewedAt = new Date(subscription.current_period_start * 1000)
  const validUntil = new Date(subscription.current_period_end * 1000)

  // If the subscription has not been renewed and the tier
  if (now < validUntil.valueOf() && user.sub?.tierId === expectedTier._id) {
    user.billing.lastChecked = new Date().toISOString()
    user.billing.validUntil = validUntil.toISOString()
    user.billing.lastRenewed = renewedAt.toISOString()
    await store.users.updateUser(user._id, { billing: user.billing })
    return expectedTier.level
  }

  if (validUntil.valueOf() < now) {
    user.billing.lastChecked = new Date().toISOString()
    user.billing.validUntil = validUntil.toISOString()
    user.billing.lastRenewed = renewedAt.toISOString()
    user.billing.status = 'cancelled'
    user.billing.cancelling = false
    await store.users.updateUser(user._id, { billing: user.billing })
    return new Error('Your subscripion has expired')
  }

  user.billing.lastRenewed = renewedAt.toISOString()
  user.billing.validUntil = validUntil.toISOString()
  user.billing.lastChecked = new Date().toISOString()
  user.billing.status = subscription.status === 'active' ? 'active' : 'cancelled'
  user.sub = { level: expectedTier.level, tierId: expectedTier._id }
  await store.users.updateUser(user._id, { billing: user.billing, sub: user.sub })
  return expectedTier.level
}
