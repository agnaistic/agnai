import { createProvider } from 'evtstore/provider/mongo'
import { logger } from '../logger'
import { getDb } from '../db/client'
import { Provider, createDomainV2 } from 'evtstore'
import { billingAgg } from './billing/agg'

let resolver: (provider: any) => void

export const providerAsync: Promise<Provider<any>> = new Promise((resolve) => {
  resolver = resolve
})

export async function setupDomain() {
  const db = getDb()

  const provider = createProvider({
    bookmarks: db.collection<any>('evtstore-bookmarks'),
    events: db.collection<any>('evtstore-events'),
    limit: 1000,
    onError: (err, stream, bookmark, event) => {
      logger.error({ err, event, stream, bookmark }, `Event failed`)
    },
  })

  resolver(provider)
}

const { domain, createHandler } = createDomainV2(
  { provider: providerAsync, useCache: false },
  { billing: billingAgg }
)

export { domain, createHandler }
