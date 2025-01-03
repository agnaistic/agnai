import Stripe from 'stripe'
import { config } from '/srv/config'
import { AppSchema } from '/common/types'
import { logger } from '../../middleware'
import { store } from '/srv/db'
import { getCachedTiers } from '/srv/db/subscriptions'
import { domain } from '/srv/domains'
import { subsCmd } from '/srv/domains/subs/cmd'

export const stripe = new Stripe(config.billing.private, { apiVersion: '2023-08-16' })

const ONE_HOUR_MS = 60000 * 60

export async function resyncSubscription(user: AppSchema.User) {
  const subscription = await findValidSubscription(user)

  if (!subscription) {
    if (!user.billing) return

    // Don't throw when already cancelled
    if (user.billing.status === 'cancelled') return

    // Remove subscription if the call succeeds, but returns no active subscription
    // Don't clear it if it's occupied by other provider
    if (user.sub && user.sub.type === 'native') {
      await store.users.updateUser(user._id, { sub: null as any })
    }

    if (user.billing) {
      user.billing.cancelling = false
      user.billing.status = 'cancelled'

      // if (isActive(user.billing.validUntil)) {
      //   user.billing.validUntil = new Date(Date.now() - ONE_HOUR_MS * 2).toISOString()
      // }

      await store.users.updateUser(user._id, { billing: user.billing })
    }

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
      { customerId: user.billing?.customerId, plan, userId: user._id },
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

  const billing: AppSchema.User['billing'] = user.billing
    ? user.billing
    : {
        lastChecked: new Date().toISOString(),
        validUntil: new Date(0).toDateString(),
        customerId: '',
        lastRenewed: '',
        status: 'cancelled',
        subscriptionId: '',
      }

  if (billing.subscriptionId !== subscription.id) {
    billing.subscriptionId = subscription.id
    billing.customerId = subscription.customer as string
  }

  /**
   * If the subscription has not been renewed and the tier is downgrading then ensure
   * the sub is still valid and return to pre-downgrade level
   */
  const isDowngrading = user.sub?.tierId === expectedTier._id
  if (isActive(validUntil) && isDowngrading) {
    billing.lastChecked = new Date().toISOString()
    billing.validUntil = validUntil.toISOString()
    billing.lastRenewed = renewedAt.toISOString()
    billing.status = 'active'
    await store.users.updateUser(user._id, { billing })
    return expectedTier.level
  }

  if (!isActive(validUntil)) {
    billing.lastChecked = new Date().toISOString()
    billing.validUntil = validUntil.toISOString()
    billing.lastRenewed = renewedAt.toISOString()
    billing.status = 'cancelled'
    billing.cancelling = false
    await store.users.updateUser(user._id, { billing })
    return new Error('Your subscripion has expired')
  }

  billing.lastRenewed = renewedAt.toISOString()
  billing.validUntil = validUntil.toISOString()
  billing.lastChecked = new Date().toISOString()
  billing.status = 'active'
  user.sub = { level: expectedTier.level, tierId: expectedTier._id }
  await store.users.updateUser(user._id, { billing, sub: user.sub })
  return expectedTier.level
}

export async function findValidSubscription(user: AppSchema.User) {
  const subs: Stripe.Subscription[] = []

  const sessions = user.billing?.customerId
    ? await stripe.checkout.sessions
        .list({
          customer: user.billing.customerId,
          expand: ['data.subscription', 'data.subscription.plan'],
        })
        .then((res) => res.data)
        .catch((err) => [])
    : []

  const sessionIds = (user.stripeSessions || [])
    .slice()
    .reverse()
    .filter((id) => !sessions.some((s) => s.id === id))

  for (const sessionId of sessionIds) {
    const session = await stripe.checkout.sessions
      .retrieve(sessionId, { expand: ['subscription', 'subscription.plan'] })
      .catch((err) => ({ err }))

    if (!session || 'err' in session || !session.subscription) continue
    sessions.push(session)
  }

  for (const session of sessions) {
    if (session.payment_status !== 'paid') continue
    if (!session.subscription) continue

    const sub = session.subscription as Stripe.Subscription
    if (sub.status !== 'active') {
      continue
    }

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
    if (!plan) {
      return prev
    }

    if (curr.status !== 'active') {
      return prev
    }

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
  const now = Date.now() - ONE_HOUR_MS * hours

  return now < valid.valueOf()
}
