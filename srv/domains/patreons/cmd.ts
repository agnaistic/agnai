import { createCommands } from 'evtstore'
import { domain } from '../domain'
import { PatreonEvt, PatreonAgg, PatreonCmd } from './types'

export const patronCmd = createCommands<PatreonEvt, PatreonAgg, PatreonCmd>(domain.patron, {
  async link(cmd, _agg) {
    return {
      type: 'linked',
      userId: cmd.userId,
    }
  },
  async unlink(cmd, _agg) {
    return {
      type: 'unlinked',
      userId: cmd.userId,
      reason: cmd.reason,
    }
  },
})
