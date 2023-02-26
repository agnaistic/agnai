import { v4 } from 'uuid'
import { db } from '../../db'
import { logger } from '../../logger'

const locks = db('chat-lock')

/**
 * We will use a semaphore to prevent multiple message requests to the same conversion.
 * We will verify the status of the lock at various times to ensure it's validity.
 *
 * This may not be completely fool-proof.
 * We are relying on the database to throw when a unique constraint is violated.
 */

export async function obtainLock(chatId: string, ttl = 20) {
  const existing = await locks.findOne({ kind: 'chat-lock', chatLock: chatId })
  if (existing) {
    const expires = new Date(existing.obtained)
    expires.setSeconds(expires.getSeconds() + existing.ttl)

    // If the expiry time is in the future, we cannot obtain a lock
    if (expires.valueOf() > Date.now()) {
      logger.debug({ existing, chatId }, 'Lock already exists')
      throw new Error(`Unable to obtain lock: Lock already exists`)
    }
  }

  const lockId = v4()
  await locks.updateOne(
    { chatLock: chatId },
    {
      $set: {
        chatLock: chatId,
        kind: 'chat-lock',
        ttl,
        obtained: new Date().toISOString(),
        lockId,
      },
    },
    { upsert: true }
  )

  logger.debug({ lockId, chatId }, 'Lock obtained')
  return lockId
}

export async function releaseLock(chatId: string) {
  await locks.deleteMany({ chatLock: chatId }, {})
  logger.debug({ chatId }, 'Lock released')
}

export async function verifyLock(opts: { chatId: string; lockId: string }) {
  const lock = await locks.findOne({ chatLock: opts.chatId })
  if (!lock) {
    throw new Error(`Lock is not valid: Lock does not exist`)
  }

  if (lock.lockId !== opts.lockId) {
    throw new Error(`Lock is not valid: Lock IDs do not much`)
  }

  logger.debug(opts, 'Lock verified')
}
