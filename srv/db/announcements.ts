import { v4 } from 'uuid'
import { db } from './client'
import { now } from './util'
import { AppSchema } from '/common/types'
import { StatusError } from '../api/wrap'

export async function getAnnouncements() {
  const list = await db('announcement')
    .find({ hide: false, showAt: { $lte: now() } })
    .sort({ showAt: -1 })
    .toArray()

  return list.filter((l) => !l.deletedAt)
}

async function getAnnoucement(id: string) {
  return db('announcement').findOne({ _id: id })
}

export async function getAdminAnnouncements() {
  return db('announcement').find({}).sort({ createdAt: -1 }).toArray()
}

export async function updateAnnouncement(id: string, update: Partial<AppSchema.Announcement>) {
  await db('announcement').updateOne({ _id: id }, { $set: { ...update, updatedAt: now() } })
  const next = await getAnnoucement(id)
  if (!next) {
    throw new StatusError('Announcement not found', 404)
  }
  return next
}

export async function createAnnouncement(create: OmitId<AppSchema.Announcement, Dates>) {
  const id = v4()
  if (create.showAt <= new Date().toISOString()) {
    create.showAt = new Date(Date.now() - 30000).toISOString()
  }

  const insert = {
    _id: id,
    kind: 'announcement',
    updatedAt: now(),
    createdAt: now(),
    ...create,
  } as const

  await db('announcement').insertOne(insert)
  return insert
}
