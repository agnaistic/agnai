import { db } from './client'
import { encryptPassword } from './util'

export async function getUsers() {
  const list = await db('user').find({ kind: 'user' }).toArray()
  return list
}

export async function changePassword(opts: { username: string; password: string }) {
  const hash = await encryptPassword(opts.password)
  await db('user').updateOne({ kind: 'user', username: opts.username }, { $set: { hash } })
  return true
}

export async function getUserInfo(userId: string) {
  const profile = await db('profile').findOne({ userId })
  const chats = await db('chat').countDocuments({ userId })
  const characters = await db('character').countDocuments({ userId })

  return { userId, chats, characters, handle: profile?.handle, avatar: profile?.avatar }
}
