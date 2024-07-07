import { createAggregate } from 'evtstore'
import { PatreonAgg, PatreonEvt } from './types'

export const patronAgg = createAggregate<PatreonEvt, PatreonAgg, 'patrons'>({
  stream: 'patrons',
  create: () => ({ userId: '', history: [] }),
  fold: (ev, prev) => {
    switch (ev.type) {
      case 'linked': {
        return { userId: ev.userId, history: prev.history.concat(ev) }
      }

      case 'unlinked': {
        return { userId: '', history: prev.history.concat(ev) }
      }
    }
  },
})
