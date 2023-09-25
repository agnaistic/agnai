import { createHandler } from '../domain'

export const billingMgr = createHandler('billing-manager', ['billing'], {
  continueOnError: false,
  alwaysTailStream: false,
  tailStream: false,
})
