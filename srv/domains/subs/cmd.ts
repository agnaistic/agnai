import { CommandError, createCommands } from 'evtstore'
import { SubsAgg, SubsCmd, SubsEvt } from './types'
import { domain } from '../domain'

export const subsCmd = createCommands<SubsEvt, SubsAgg, SubsCmd>(domain.subscription, {
  async subscribe(cmd, agg) {
    if (agg.state !== 'new' && agg.state !== 'cancelled') {
      throw new CommandError(`Cannot subscribe - Already subscribed`, 'ALREADY_SUBSCRIBED')
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
  async cancel(cmd, agg) {
    if (agg.state !== 'active') {
      throw new CommandError('Cannot cancel subscription - Subscription not active', 'NOT_ACTIVE')
    }

    return { type: 'cancelled' }
  },
})
