import { StatusError, handle } from '../wrap'
import { assertValid } from '/common/valid'
import { store } from '../../db'
import { stripe } from './stripe'
import { v4 } from 'uuid'
import { config } from '../../config'
import { billingCmd, domain } from '../../domains'
import { subsCmd } from '../../domains/subs/cmd'
import { AppSchema } from '/common/types'

export const startCheckout = handle(async ({ body, userId }) => {
  assertValid({ tierId: 'string', callback: 'string' }, body)

  const tier = await store.subs.getTier(body.tierId)
  if (!tier) {
    throw new StatusError('Invalid subscription tier', 400)
  }

  const requestId = v4()
  const domain = config.billing.domains.find((d) => d === body.callback.toLowerCase())

  if (!domain) {
    throw new StatusError(`Invalid checkout callback URL`, 400)
  }

  const user = await store.users.getUser(userId)

  const session = await stripe.checkout.sessions.create({
    customer: user?.billing?.customerId,
    success_url: `${domain}/checkout/success?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
    cancel_url: `${domain}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [{ price: tier.priceId, quantity: 1 }],
    metadata: { tierId: body.tierId, userId },
  })

  await subsCmd.startSession(userId, {
    tierId: tier._id,
    sessionId: session.id,
  })

  await billingCmd.request(session.id, {
    priceId: tier.priceId,
    productId: tier.productId,
    tierId: body.tierId,
    sessionId: session.id,
    userId,
  })

  if (user) {
    const sessions = user.stripeSessions || []
    sessions.push(session.id)
    await store.users.updateUser(userId, { stripeSessions: sessions })
  }

  return { requestId, sessionUrl: session.url }
})

export const viewSession = handle(async ({ body }) => {
  assertValid({ sessionId: 'string' }, body)

  const session = await stripe.checkout.sessions.retrieve(body.sessionId)
  if (!session) {
    throw new StatusError(`Session not found`, 404)
  }
  return session
})

export const assignSubscription = handle(async ({ body, log }) => {
  assertValid({ subscriptionId: 'string', userId: 'string' }, body)

  const subscription = await stripe.subscriptions.retrieve(body.subscriptionId)
  if (!subscription) {
    throw new StatusError('Subscription not found', 404)
  }

  if (subscription.status !== 'active') {
    throw new StatusError(`Subscription is not active. Currently ${subscription.status}`, 400)
  }

  const user = await store.users.getUser(body.userId)

  if (!user) {
    throw new StatusError('Cannot find user', 404)
  }

  const lastRenewed = new Date(subscription.current_period_start * 1000).toISOString()
  const validUntil = new Date(subscription.current_period_end * 1000).toISOString()
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0].price.id
  const productId = subscription.items.data[0].price.product as string

  if (!customerId || !priceId || !productId) {
    log.error({ customerId, priceId, productId }, 'Failed to assign subscription manually')
    throw new StatusError(`Subscription is missing information`, 400)
  }

  const tier = await store.subs.getCachedTiers().find((t) => t.productId === productId)

  if (!tier) {
    throw new StatusError(`Cannot find matching tier for subscription (by product id)`, 400)
  }

  await subsCmd.adminSubscribe(body.userId, {
    customerId,
    priceId,
    productId,
    subscription,
    subscriptionId: body.subscriptionId,
    tierId: tier._id,
  })

  const next = await store.users.updateUser(user._id, {
    sub: {
      tierId: tier._id,
      level: tier.level,
    },
    billing: {
      status: 'active',
      customerId,
      lastRenewed,
      validUntil,
      subscriptionId: body.subscriptionId,
      lastChecked: new Date().toISOString(),
    },
  })

  if (!next) {
    throw new StatusError(`Failed to update user`, 400)
  }

  return next.sub
})

export const finishCheckout = handle(async ({ body, userId }) => {
  assertValid({ sessionId: 'string', state: 'string' }, body)

  const session = await stripe.checkout.sessions.retrieve(body.sessionId)
  const user = await store.users.getUser(userId)

  if (!session) {
    throw new StatusError(`Invalid checkout`, 400)
  }

  const agg = await domain.billing.getAggregate(body.sessionId)
  if (body.state === 'success') {
    if (session.payment_status !== 'paid') {
      await billingCmd.fail(body.sessionId, { userId, session, reason: 'payment status not paid' })
      throw new StatusError(
        `Unable to update subscription: Payment status invalid (${session.payment_status})`,
        400
      )
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

    await stripe.subscriptions
      .update(session.subscription as string, {
        metadata: {
          userId,
          tierId: agg.tierId,
          username: user?.username || '',
        },
      })
      .catch(() => {})

    const now = new Date()
    const lastRenewed = now.toISOString()
    now.setMonth(now.getMonth() + 1)
    const validUntil = now.toISOString()

    const tier = await store.subs.getTier(agg.tierId)
    await billingCmd.success(body.sessionId, { userId, session, tier })
    await subsCmd.subscribe(userId, {
      customerId: session.customer as string,
      priceId: agg.priceId,
      productId: agg.productId,
      tierId: agg.tierId,
      subscription,
      subscriptionId: subscription.id,
    })

    if (user && subscription.id) {
      await ensureOnlyActiveSubscription(user, subscription.id)
    }

    const config = await store.users.updateUser(userId, {
      sub: {
        tierId: agg.tierId,
        level: tier.level,
      },
      billing: {
        status: 'active',
        customerId: session.customer as string,
        lastRenewed,
        validUntil,
        subscriptionId: session.subscription as string,
      },
    })

    if (!config) {
      throw new StatusError(`Failed to update subscription - Please contact support`, 500)
    }

    return config.sub
  }

  if (body.state === 'cancel') {
    await billingCmd.cancel(body.sessionId, { userId })
  }
})

async function ensureOnlyActiveSubscription(user: AppSchema.User, subscriptionId: string) {
  // The user isn't an existing customer -- ignore
  if (!user.billing?.customerId) return

  const subs = await stripe.subscriptions
    .list({ customer: user.billing.customerId, status: 'active' })
    .then((res) => res.data)
    .catch(() => [])

  for (const sub of subs) {
    if (sub.id !== subscriptionId) {
      await subsCmd.cancelDuplicate(user._id, { subscriptionId, replacementId: subscriptionId })
      await stripe.subscriptions.cancel(sub.id, {
        cancellation_details: { comment: 'duplicate detected during checkout' },
      })
    }
  }
}
