import { v4 } from 'uuid'
import { getDb } from '../db/client'
import { createHandler } from './domain'
import { logger } from '../middleware'

type Handler = ReturnType<typeof createHandler>

export async function obtainManagerLock(handler: Handler) {
  const sessionId = v4()

  const result = await getDb()
    .collection<{ id: string; ttl: number; sessionId: string }>('evtstore-lock')
    .findOneAndUpdate(
      {
        id: `lock-${handler.name}`,
        ttl: { $lt: Date.now() },
      },
      {
        $set: {
          id: `lock-${handler.name}`,
          ttl: Date.now() + 10000,
          sessionId,
        },
      },
      { upsert: true }
    )

  if (result.value?.sessionId === sessionId) {
    logger.info(`Started event handler: ${handler.name}`)
    handler.start()

    const timer = setInterval(async () => {
      getDb()
        .collection('evtstore-lock')
        .findOneAndUpdate({ sessionId }, { $set: { ttl: Date.now() + 10000 } })
    })

    process.on('SIGTERM', () => clearInterval(timer))
    return
  }

  setTimeout(() => obtainManagerLock(handler), 5000)
}
