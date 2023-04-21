import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'

export async function getNotificationsCount(userId: string) {
  return db('notification').countDocuments({ userId: userId })
}

export async function getNotifications(userId: string) {
  const list = await db('notification')
    .find({ kind: 'notification', userId })
    .sort({ createdAt: -1 })
    .toArray()
  return list
}

export async function createNotification(
  notification: Omit<AppSchema.Notification, '_id' | 'kind' | 'createdAt'>
) {
  const id = `${v4()}`
  const body: AppSchema.Notification = {
    ...notification,
    createdAt: new Date().toISOString(),
    _id: id,
    kind: 'notification',
  }
  await db('notification').insertOne(body)
  return body
}

export async function trimNotifications(userId: string, amountToRemove: number) {
  db('notification').aggregate([
    { $match: { userId: userId } },
    { $sort: { createdAt: 1 } },
    { $limit: amountToRemove },
    {
      $delete: {
        delete: true,
      },
    },
  ])
}

export async function deleteNotification(userId: string, notificationId: string) {
  await db('notification').deleteOne({ userId, _id: notificationId })
}

export async function deleteAllNotifications(userId: string) {
  await db('notification').deleteMany({ userId: userId })
}
