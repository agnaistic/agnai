import { StatusError, handle } from '../wrap'
import { assertValid } from '/common/valid'
import { store } from '../../db'
import { resyncSubscription, stripe } from './stripe'
import { subsCmd } from '../../domains/subs/cmd'
import { domain } from '/srv/domains'
import { getSafeUserConfig } from '../user/settings'
import { getCachedTiers } from '/srv/db/subscriptions'
import { patreon } from '../user/patreon'

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
    const result = await stripe.subscriptions
      .update(sub.id, {
        payment_behavior: 'error_if_incomplete',
        proration_behavior: 'always_invoice',
        metadata: { tierId: body.tierId, upgradedAt: new Date().toISOString() },
        items: [{ id: item.id, price: tier.priceId }],
      })
      .catch((err) => ({ err }))

    if ('err' in result) {
      throw new StatusError(`Payment failed: ${result.err.message}`, 402)
    }

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
  const result = await resyncSubscription(user)
  if (result instanceof Error) {
    throw new StatusError(result.message, 402)
  }

  const next = await getSafeUserConfig(userId)
  return next
})

export const retrieveSubscription = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId)

  const errors: string[] = []

  if (user?.billing?.subscriptionId || user?.stripeSessions?.length) {
    const result = await resyncSubscription(user).catch((err: Error) => ({ err }))
    if (!result) {
      errors.push(`Error occurred while retrieving subscription infomation`)
    } else if (typeof result === 'object' && 'err' in result && result.err?.message) {
      errors.push(result.err.message)
    }
  }

  if (user?.patreonUserId) {
    const result = await patreon.revalidatePatron(user).catch((err: Error) => ({ err }))
    if (result !== null && 'err' in result && result.err?.message) {
      errors.push(result.err.message)
    }
  }

  const next = await getSafeUserConfig(userId)
  return { user: next, errors }
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

export const adminGift = handle(async ({ userId, body, params }) => {
  assertValid({ tierId: 'string', expiresAt: 'string', userId: 'string' }, body)

  const user = await store.users.getUser(body.userId)
  if (!user) {
    throw new StatusError('User not found', 404)
  }

  if (!body.tierId) {
    await subsCmd.adminManual(body.userId, {
      byAdminId: userId,
      expiresAt: '',
      tierId: '',
    })

    await store.users.updateUser(body.userId, { manualSub: null as any })

    return { success: true }
  }

  const tier = getCachedTiers().find((t) => t._id === body.tierId)
  if (!tier) {
    throw new StatusError('Tier not found', 404)
  }

  await subsCmd.adminManual(body.userId, {
    byAdminId: userId,
    expiresAt: body.expiresAt,
    tierId: body.tierId,
  })

  await store.users.updateUser(body.userId, {
    manualSub: {
      expiresAt: body.expiresAt,
      level: tier.level,
      tierId: tier._id,
    },
  })

  return { success: true }
})
