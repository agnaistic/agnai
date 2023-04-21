import { sendOne } from './api/ws'
import { store } from './db'

const maxNotifications = 100

export async function notificationDispatch(
  userId: string,
  notification: { text: string; link: string }
) {
  const count = await store.notifications.getNotificationsCount(userId)

  if (count > maxNotifications) {
    await store.notifications.trimNotifications(userId, maxNotifications)
  }

  const item = await store.notifications.createNotification({
    userId: userId,
    text: notification.text,
    link: notification.link,
  })

  sendOne(userId, { type: 'notification-created', notification: item })

  return { success: true }
}
