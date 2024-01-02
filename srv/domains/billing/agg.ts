import { createAggregate } from 'evtstore'
import { BillingAgg, BillingEvt } from './types'

export const billingAgg = createAggregate<BillingEvt, BillingAgg, 'billing'>({
  stream: 'billing',
  create: () => ({
    priceId: '',
    productId: '',
    sessionId: '',
    state: 'new',
    tierId: '',
    userId: '',
  }),
  fold: (ev, prev) => {
    switch (ev.type) {
      case 'requested':
        return {
          state: 'request',
          priceId: ev.priceId,
          productId: ev.productId,
          sessionId: ev.sessionId,
          tierId: ev.tierId,
          userId: ev.userId,
        }

      case 'cancelled':
        return { state: 'cancel' }

      case 'failed':
        return { state: 'fail' }

      case 'succesful':
        return { state: 'success', session: ev.session }
    }
  },
})
