import { createAggregate } from 'evtstore'
import { SubsAgg, SubsEvt } from './types'

export const subsAgg = createAggregate<SubsEvt, SubsAgg, 'subscriptions'>({
  stream: 'subscriptions',
  create: () => ({
    state: 'new',
    customerId: '',
    priceId: '',
    subscriptionId: '',
    tierId: '',
    periodStart: '',
  }),
  fold: (ev, prev, meta) => {
    switch (ev.type) {
      case 'subscribed': {
        return {
          state: 'active',
          customerId: ev.customerId,
          priceId: ev.priceId,
          subscriptionId: ev.subscriptionId,
          tierId: ev.tierId,
          periodStart: ev.periodStart,
        }
      }

      case 'cancelled': {
        const endAt = new Date(prev.periodStart)
        endAt.setFullYear(meta.timestamp.getFullYear())
        endAt.setMonth(meta.timestamp.getMonth() + 1)
        if (endAt.valueOf() > Date.now()) {
          return { state: 'active', cancelledAt: meta.timestamp, downgrade: undefined }
        }

        return { state: 'cancelled', cancelledAt: meta.timestamp, tierId: '', downgrade: undefined }
      }

      case 'resumed': {
        return { state: 'active' }
      }

      case 'upgraded': {
        return { tierId: ev.tierId, priceId: ev.priceId, downgrade: undefined }
      }

      case 'downgraded': {
        const activeAt = new Date(ev.activeAt)
        if (activeAt.valueOf() <= Date.now()) {
          return {
            priceId: ev.priceId,
            tierId: ev.tierId,
            downgrade: undefined,
          }
        }

        return {
          priceId: ev.priceId,
          downgrade: {
            activeAt: new Date(ev.activeAt),
            tierId: ev.tierId,
            requestedAt: new Date(meta.timestamp.valueOf()),
          },
        }
      }
    }
  },
})
