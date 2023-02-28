import { logger } from '../logger'
import { db } from './client'
import { encrypt } from './util'

const users = db('user')

export async function getUsers() {
  const list = await users.find({ kind: 'user' })
  return list
}

export async function changePassword(opts: { username: string; password: string }) {
  const hash = await encrypt(opts.password)
  await users.updateOne({ kind: 'user', username: opts.username }, { $set: { hash } })
  logger.info(opts, 'Password updated')
  return true
}
