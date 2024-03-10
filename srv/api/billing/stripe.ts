import Stripe from 'stripe'
import { config } from '/srv/config'
import { AppSchema } from '/common/types'
import { logger } from '/srv/logger'
import { store } from '/srv/db'
import { getCachedTiers } from '/srv/db/subscriptions'
import { domain } from '/srv/domains'
import { subsCmd } from '/srv/domains/subs/cmd'

export const stripe = new Stripe(config.billing.private, { apiVersion: '2023-08-16' })

export async function resyncSubscription(user: AppSchema.User) {
  if (!user.billing) return

  const subscription = await findValidSubscription(user)
  if (!subscription) {
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

  // Provide a buffer (1 or more hours) to allow subscriptions to auto-renew
  // Automatic invoices seem to be in a draft status for ~1 hour so provide enough time for it to clear
  const renewedAt = new Date(subscription.current_period_start * 1000)
  const validUntil = new Date(subscription.current_period_end * 1000)

  /**
   * If the subscription has not been renewed and the tier is downgrading then ensure
   * the sub is still valid and return to pre-downgrade level
   */
  const isDowngrading = user.sub?.tierId === expectedTier._id
  if (isActive(validUntil) && isDowngrading) {
    user.billing.lastChecked = new Date().toISOString()
    user.billing.validUntil = validUntil.toISOString()
    user.billing.lastRenewed = renewedAt.toISOString()
    user.billing.status = 'active'
    await store.users.updateUser(user._id, { billing: user.billing })
    return expectedTier.level
  }

  if (!isActive(validUntil)) {
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
  user.billing.status = 'active'
  user.sub = { level: expectedTier.level, tierId: expectedTier._id }
  await store.users.updateUser(user._id, { billing: user.billing, sub: user.sub })
  return expectedTier.level
}

async function findValidSubscription(user: AppSchema.User) {
  if (!user.billing) return

  const subscription = await stripe.subscriptions
    .retrieve(user.billing.subscriptionId, { expand: ['plan'] })
    .catch((err) => ({ err }))

  if ('err' in subscription === false && isActive(subscription.current_period_end)) {
    return subscription
  }

  const sessionIds = (user.stripeSessions || []).slice().reverse()
  const subs: Stripe.Subscription[] = []

  for (const sessionId of sessionIds) {
    const session = await stripe.checkout.sessions
      .retrieve(sessionId, { expand: ['subscription', 'subscription.plan'] })
      .catch((err) => ({ err }))

    if ('err' in session) continue
    if (session.payment_status !== 'paid') continue
    if (!session.subscription) continue

    const sub = session.subscription as Stripe.Subscription
    if (isActive(sub.current_period_end)) {
      subs.push(sub)
    }
  }

  if (!subs.length) return

  const allTiers = getCachedTiers()
  const state = await domain.subscription.getAggregate(user._id)
  const predowngradeId = state.state === 'active' && state.downgrade ? state.tierId : undefined

  let match: AppSchema.SubscriptionTier | undefined
  const bestSub = subs.reduce<Stripe.Subscription | undefined>((prev, curr) => {
    const plan: Stripe.Plan | undefined = (curr as any).plan
    if (!plan) return prev

    const tier = allTiers.find((t) => {
      if (predowngradeId) return t._id === predowngradeId
      return !!plan && t.productId === plan.product
    })

    if (!tier) return prev
    if (!prev || tier.level > match!.level) {
      match = tier
      return curr
    }

    return prev
  }, undefined)

  const plan: Stripe.Plan = bestSub ? (bestSub as any).plan : undefined
  if (bestSub && plan && bestSub.id !== state.subscriptionId) {
    const priceId = bestSub.items.data[0].price.id
    const productId = bestSub.items.data[0].price.product as string
    await subsCmd.subscribe(user._id, {
      customerId: bestSub.customer as string,
      priceId,
      productId,
      subscription: bestSub,
      subscriptionId: bestSub.id,
      tierId: match?._id!,
    })
  }

  return bestSub
}

/**
 * Provides a grace period for expiry
 * @param until
 * @returns
 */
export function isActive(until: Date | number | string, hours = 2) {
  const ms =
    typeof until === 'string'
      ? new Date(until).valueOf()
      : typeof until === 'number'
      ? until
      : until.valueOf()

  const valid = new Date(ms * 1000)
  const now = Date.now() - 60000 * 60 * hours

  return now < valid.valueOf()
}
