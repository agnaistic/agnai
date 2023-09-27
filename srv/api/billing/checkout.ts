import { StatusError, handle } from '../wrap'
import { assertValid } from '/common/valid'
import { store } from '../../db'
import { stripe } from './stripe'
import { v4 } from 'uuid'
import { config } from '../../config'
import { billingCmd, domain } from '../../domains'
import { subsCmd } from '../../domains/subs/cmd'

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

  const session = await stripe.checkout.sessions.create({
    success_url: `${domain}/checkout/success?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
    cancel_url: `${domain}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [{ price: tier.priceId, quantity: 1 }],
    metadata: { tierId: body.tierId },
  })

  await billingCmd.request(session.id, {
    priceId: tier.priceId,
    productId: tier.productId,
    tierId: body.tierId,
    sessionId: session.id,
    userId,
  })

  return { requestId, sessionUrl: session.url }
})

export const finishCheckout = handle(async ({ body, userId }) => {
  assertValid({ sessionId: 'string', state: 'string' }, body)

  const session = await stripe.checkout.sessions.retrieve(body.sessionId)
  if (!session) {
    throw new StatusError(`Invalid checkout`, 400)
  }

  const agg = await domain.billing.getAggregate(body.sessionId)
  if (agg.state !== 'request') {
    throw new StatusError(`Invalid checkout status (${agg.state})`, 400)
  }

  if (body.state === 'success') {
    if (session.payment_status !== 'paid') {
      throw new StatusError(
        `Unable to update subscription: Payment status invalid (${session.payment_status})`,
        400
      )
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
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
