import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { notificationsApi } from './data/notifications'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type NotificationState = {
  loading: boolean
  list: NotificationData[]
}

export type NotificationData = Omit<AppSchema.Notification, 'kind' | 'userId'> & {
  read?: boolean
}

export type NewNotification = Pick<NotificationData, 'text' | 'link'>

const initState: NotificationState = {
  loading: true,
  list: [],
}

export const notificationStore = createStore<NotificationState>(
  'notification',
  initState
)(() => {
  return {
    async *getNotifications(state) {
      yield { loading: true, notifications: state.list }
      const res = await notificationsApi.getNotifications()

      if (res.error) {
        toastStore.error('Failed to retrieve notifications')
        return { loading: false, list: state.list }
      } else if (res.result) {
        const result: NotificationData[] = res.result.notifications
        const stillExists = new Set(result.map((item: NotificationData) => item._id))
        for (const item of state.list) {
          if (!stillExists.has(item._id)) {
            result.push({ ...item, read: true })
          }
        }
        return { loading: false, list: result }
      } else {
        return { loading: false, list: [] }
      }
    },

    async createNotification(_, notification: NewNotification) {
      const res = await notificationsApi.createNotification(notification)

      if (res.error) {
        toastStore.error('Failed to send notification')
      }
    },

    async readNotification(state, notificationId) {
      const res = await notificationsApi.deleteNotification(notificationId)
      if (res.error) {
        toastStore.error('Failed to mark notification as read')
      }
      return { list: state.list.map((n) => (n._id === notificationId ? { ...n, read: true } : n)) }
    },

    async readAllNotifications(state) {
      const res = await notificationsApi.deleteAllNotifications()
      if (res.error) {
        toastStore.error('Failed to mark all notifications as read')
      }
      return { list: state.list.map((n) => ({ ...n, read: true })) }
    },

    receiveNotification(state, notification: NotificationData) {
      toastStore.normal(`Notification: ${notification.text}`)
      return { list: [notification, ...state.list] }
    },
  }
})

subscribe(
  'notification-created',
  { notification: { _id: 'string', text: 'string', link: 'string', createdAt: 'string' } },
  (body) => {
    notificationStore.receiveNotification(body.notification)
  }
)
