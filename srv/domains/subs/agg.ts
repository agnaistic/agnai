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
    history: [],
    sessions: [],
  }),
  fold: (ev, prev, meta) => {
    const tierId = 'tierId' in ev ? ev.tierId : undefined
    const subscriptionId = 'subscriptionId' in ev ? ev.subscriptionId : undefined

    const history = prev.history.concat({
      type: ev.type,
      time: meta.timestamp.toISOString(),
      tierId,
      subscriptionId,
    })

    switch (ev.type) {
      // We don't alter the aggregate here, admin-manual events are purely for record keeping
      case 'admin-manual': {
        return {
          ...prev,
          downgrade: undefined,
          history,
        }
      }

      case 'session-started': {
        return {
          ...prev,
          sessions: prev.sessions.concat(ev.sessionId),
        }
      }

      case 'admin-subscribe':
      case 'subscribed': {
        return {
          state: 'active',
          customerId: ev.customerId,
          priceId: ev.priceId,
          subscriptionId: ev.subscriptionId,
          tierId: ev.tierId,
          periodStart: ev.periodStart,
          history,
          downgrade: undefined,
        }
      }

      case 'cancelled-duplicate': {
        return {
          state: prev.state,
          downgrade: prev.downgrade,
          history,
        }
      }

      case 'cancelled': {
        const endAt = new Date(prev.periodStart)
        endAt.setFullYear(meta.timestamp.getFullYear())
        endAt.setMonth(meta.timestamp.getMonth() + 1)
        if (endAt.valueOf() > Date.now()) {
          return {
            state: 'active',
            cancelledAt: meta.timestamp,
            downgrade: prev.downgrade,
            history,
          }
        }

        return {
          state: 'cancelled',
          cancelledAt: meta.timestamp,
          tierId: '',
          downgrade: undefined,
          history,
        }
      }

      case 'resumed': {
        return { state: 'active', history }
      }

      case 'upgraded': {
        return { tierId: ev.tierId, priceId: ev.priceId, downgrade: undefined, history }
      }

      case 'downgraded': {
        const activeAt = new Date(ev.activeAt)
        if (activeAt.valueOf() <= Date.now()) {
          return {
            priceId: ev.priceId,
            tierId: ev.tierId,
            downgrade: undefined,
            history,
          }
        }

        return {
          priceId: ev.priceId,
          downgrade: {
            activeAt: new Date(ev.activeAt),
            tierId: ev.tierId,
            requestedAt: new Date(meta.timestamp.valueOf()),
          },
          history,
        }
      }
    }
  },
})
