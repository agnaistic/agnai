import { logger } from '../logger'
import { db } from './client'
import { encryptPassword } from './util'

export async function getUsers() {
  const list = await db('user').find({ kind: 'user' }).toArray()
  return list
}

export async function changePassword(opts: { username: string; password: string }) {
  const hash = await encryptPassword(opts.password)
  await db('user').updateOne({ kind: 'user', username: opts.username }, { $set: { hash } })
  logger.info(opts, 'Password updated')
  return true
}
