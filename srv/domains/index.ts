import { billingCmd } from './billing/cmd'
import { patronCmd } from './patreons/cmd'
import { subsCmd } from './subs/cmd'

export * from './domain'
export * from './billing/cmd'
export * from './patreons/cmd'

export const command = {
  billing: billingCmd,
  patron: patronCmd,
  sub: subsCmd,
}
