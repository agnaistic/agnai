import { CommandError, createCommands } from 'evtstore'
import { domain } from '../domain'
import { BillingAgg, BillingCmd, BillingEvt } from './types'

export const billingCmd = createCommands<BillingEvt, BillingAgg, BillingCmd>(domain.billing, {
  async request(cmd, agg) {
    if (agg.state !== 'new') {
      throw new CommandError(`Invalid checkout session status`, 'INVALID_STATUS')
    }
    return {
      type: 'requested',
      priceId: cmd.priceId,
      productId: cmd.productId,
      sessionId: cmd.sessionId,
      tierId: cmd.tierId,
      userId: cmd.userId,
    }
  },
  async cancel(cmd, agg) {
    if (cmd.userId !== agg.userId) {
      throw new CommandError('Unauthorized', 'UNAUTHORIZED')
    }

    if (agg.state !== 'request') {
      throw new CommandError(`Invalid checkout session status`, 'INVALID_STATUS')
    }

    return { type: 'cancelled' }
  },
  async fail(cmd, agg) {
    if (agg.state === 'success') return

    if (cmd.userId !== agg.userId) {
      throw new CommandError('Unauthorized', 'UNAUTHORIZED')
    }

    // if (agg.state !== 'request') {
    //   throw new CommandError(`Invalid checkout session status`, 'INVALID_STATUS')
    // }

    return { type: 'failed', session: cmd.session, reason: cmd.reason }
  },
  async success(cmd, agg) {
    if (cmd.userId !== agg.userId) {
      throw new CommandError('Unauthorized', 'UNAUTHORIZED')
    }

    // if (agg.state !== 'request') {
    //   throw new CommandError(`Invalid checkout session status`, 'INVALID_STATUS')
    // }

    return { type: 'succesful', session: cmd.session, tier: cmd.tier, userId: agg.userId }
  },
})
