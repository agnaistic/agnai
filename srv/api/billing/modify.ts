import { StatusError, handle } from '../wrap'
import { assertValid } from '/common/valid'
import { store } from '../../db'
import { stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'
import { domain } from '/srv/domains'

export const modifySubscription = handle(async ({ body, userId }) => {
  assertValid({ tierId: 'string' }, body)
  const user = await store.users.getUser(userId)

  if (!user?.billing?.subscriptionId || !user?.sub?.tierId) {
    throw new StatusError('Cannot modify subscription - No subscription present', 400)
  }

  const tier = await store.subs.getTier(body.tierId)
  const previous = await store.subs.getTier(user.sub.tierId)

  if (!tier || !previous) {
    throw new StatusError(`Tier not found`, 404)
  }

  const upgrading = tier.level > previous.level
  const sub = await stripe.subscriptions.retrieve(user.billing.subscriptionId)

  if (sub.pause_collection) {
    await subsCmd.resume(userId, {})
    await stripe.subscriptions.resume(sub.id, {})
  }

  const item = sub.items.data[0]
  if (upgrading) {
    await stripe.subscriptions.update(sub.id, {
      proration_behavior: 'always_invoice',
      metadata: { tierId: body.tierId, upgradedAt: new Date().toISOString() },
      items: [{ id: item.id, price: tier.priceId }],
    })
    await subsCmd.upgrade(userId, { priceId: tier.priceId, tierId: tier._id })
    await store.users.updateUser(userId, {
      sub: {
        level: tier.level,
        tierId: body.tierId,
      },
      billing: { ...user.billing, status: 'active' },
    })
  } else {
    const next = await stripe.subscriptions.update(sub.id, {
      proration_behavior: 'none',
      metadata: { tierId: body.tierId },
      items: [{ id: item.id, price: tier.priceId }],
    })
    const activeAt = new Date(next.current_period_end * 1000)
    await subsCmd.downgrade(userId, {
      activeAt: activeAt.toISOString(),
      priceId: tier.priceId,
      tierId: body.tierId,
    })
  }

  return { success: true }
})

export const verifySubscription = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId)

  if (!user?.billing?.subscriptionId) throw new StatusError('No subscription present', 402)
  const result = await store.users.validateSubscription(user)
  if (result instanceof Error) {
    throw new StatusError(result.message, 402)
  }
  return { success: true }
})

export const subscriptionStatus = handle(async ({ userId, params, user }) => {
  const id = user?.admin && params.id ? params.id : userId
  const agg = await domain.subscription.getAggregate(id)

  return {
    status: agg.state,
    subscriptionId: agg.subscriptionId,
    priceId: agg.priceId,
    tierId: agg.tierId,
    downgrading: agg.downgrade,
    customerId: agg.customerId,
  }
})
