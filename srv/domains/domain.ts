import { createProvider, migrate } from 'evtstore/provider/mongo'
import { logger } from '../logger'
import { getDb } from '../db/client'
import { Provider, createDomainV2 } from 'evtstore'
import { billingAgg } from './billing/agg'
import { subsAgg } from './subs/agg'

let resolver: (provider: any) => void

export const providerAsync: Promise<Provider<any>> = new Promise((resolve) => {
  resolver = resolve
})

export async function setupDomain() {
  const db = getDb()

  const bookmarks = db.collection<any>('evtstore-bookmarks')
  const events = db.collection<any>('evtstore-events')

  await migrate(events, bookmarks)

  const provider = createProvider({
    events,
    bookmarks,
    limit: 1000,
    onError: (err, stream, bookmark, event) => {
      logger.error({ err, event, stream, bookmark }, `Event failed`)
    },
  })

  resolver(provider)
}

const { domain, createHandler } = createDomainV2(
  { provider: providerAsync, useCache: true },
  { billing: billingAgg, subscription: subsAgg }
)

export { domain, createHandler }
