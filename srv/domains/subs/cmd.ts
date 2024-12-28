import { CommandError, createCommands } from 'evtstore'
import { SubsAgg, SubsCmd, SubsEvt } from './types'
import { domain } from '../domain'
import { store } from '/srv/db'

export const subsCmd = createCommands<SubsEvt, SubsAgg, SubsCmd>(domain.subscription, {
  async adminSubscribe(cmd, agg) {
    if (agg.state !== 'new' && agg.state !== 'cancelled') {
      const user = await store.users.getUser(cmd.aggregateId)
      if (!user) {
        throw new CommandError(`Cannot locate user for subscription update`, 'INVALID_USER')
      }
      // if (!user.billing?.validUntil) {
      //   throw new CommandError(`Subscription valid - No expiry found`, 'NO_VALID_UNTIL')
      // }
      // const expiry = new Date(user.billing.validUntil)
      // if (expiry.valueOf() > Date.now()) {
      //   throw new CommandError(`Cannot subscribe - Already subscribed`, 'ALREADY_SUBSCRIBED')
      // }
    }

    return {
      type: 'subscribed',
      customerId: cmd.customerId,
      periodStart: new Date(cmd.subscription.current_period_start * 1000).toISOString(),
      priceId: cmd.priceId,
      subscriptionId: cmd.subscriptionId,
      tierId: cmd.tierId,
    }
  },
  async startSession(cmd, agg) {
    return {
      type: 'session-started',
      tierId: cmd.tierId,
      sessionId: cmd.sessionId,
    }
  },
  async subscribe(cmd, agg) {
    const user = await store.users.getUser(cmd.aggregateId)
    if (!user) {
      throw new CommandError(`Cannot locate user for subscription update`, 'INVALID_USER')
    }
    // if (agg.state !== 'new' && agg.state !== 'cancelled') {
    // if (!user.billing?.validUntil) {
    //   throw new CommandError(`Subscription valid - No expiry found`, 'NO_VALID_UNTIL')
    // }
    // const expiry = new Date(user.billing.validUntil)
    // if (expiry.valueOf() > Date.now()) {
    //   throw new CommandError(`Cannot subscribe - Already subscribed`, 'ALREADY_SUBSCRIBED')
    // }
    // }

    return {
      type: 'subscribed',
      customerId: cmd.customerId,
      periodStart: new Date(cmd.subscription.current_period_start * 1000).toISOString(),
      priceId: cmd.priceId,
      subscriptionId: cmd.subscriptionId,
      tierId: cmd.tierId,
    }
  },
  async upgrade(cmd, agg) {
    if (agg.state === 'new') {
      throw new CommandError(
        'Cannot upgrade subscription: not currently subscribed',
        'NOT_SUBSCRIBED'
      )
    }
    return {
      type: 'upgraded',
      priceId: cmd.priceId,
      tierId: cmd.tierId,
    }
  },
  async downgrade(cmd, agg) {
    if (agg.state === 'new') {
      throw new CommandError(
        'Cannot downgrade subscription: not currently subscribed',
        'NOT_SUBSCRIBED'
      )
    }
    return {
      type: 'downgraded',
      activeAt: cmd.activeAt,
      priceId: cmd.priceId,
      tierId: cmd.tierId,
    }
  },
  async resume(cmd, agg) {
    if (agg.state === 'new') {
      throw new CommandError(
        'Cannot resume subscription: not currently subscribed',
        'NOT_SUBSCRIBED'
      )
    }

    return { type: 'resumed' }
  },

  async cancelDuplicate(cmd, agg) {
    return {
      type: 'cancelled-duplicate',
      subscriptionId: cmd.subscriptionId,
      replacementId: cmd.replacementId,
    }
  },

  async cancel(cmd, agg) {
    if (agg.state !== 'active') {
      throw new CommandError('Cannot cancel subscription - Subscription not active', 'NOT_ACTIVE')
    }

    return { type: 'cancelled' }
  },
  async adminManual(cmd, agg) {
    return {
      type: 'admin-manual',
      tierId: cmd.tierId,
      byAdminId: cmd.byAdminId,
      expiresAt: cmd.expiresAt,
    }
  },
})
