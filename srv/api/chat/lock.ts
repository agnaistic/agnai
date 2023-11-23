import { v4 } from 'uuid'
import { db } from '../../db'

/**
 * We will use a semaphore to prevent multiple message requests to the same conversion.
 * We will verify the status of the lock at various times to ensure it's validity.
 *
 * This may not be completely fool-proof.
 * We are relying on the database to throw when a unique constraint is violated.
 *
 * TTL = seconds
 */

export async function obtainLock(chatId: string, ttl = 10) {
  const existing = await db('chat-lock').findOne({ kind: 'chat-lock', chatLock: chatId })
  if (existing) {
    const expires = new Date(existing.obtained)
    expires.setSeconds(expires.getSeconds() + existing.ttl)

    // If the expiry time is in the future, we cannot obtain a lock
    if (expires.valueOf() > Date.now()) {
      throw new Error(`Unable to obtain lock: Lock already exists`)
    }
  }

  const lockId = v4()
  await db('chat-lock').updateOne(
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

  return lockId
}

export async function releaseLock(chatId: string) {
  await db('chat-lock').deleteMany({ chatLock: chatId }, {})
}

export async function verifyLock(opts: { chatId: string; lockId: string }) {
  /**
   * We will disable this for now. We will instead take the more 'optimistic' approach of allow all generations to complete
   * instead of cancelling them if a chat manages to create concurrent generations.
   *
   * If the user manages to generate two messages at the same time, they'll experience 'ghost' messages
   * We will wait for user reports of strange behaviour
   */
  // const lock = await db('chat-lock').findOne({ chatLock: opts.chatId })
  // if (!lock) return
  // if (lock.lockId !== opts.lockId) {
  //   throw new Error(`Lock is not valid: Lock IDs do not match`)
  // }
}
