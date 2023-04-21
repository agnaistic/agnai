import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { notificationsApi } from './data/notifications'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type NotificationState = {
  loading: boolean
  list: NotificationData[]
}

export type NotificationData = Pick<AppSchema.Notification, 'text' | 'link'>

const initState: NotificationState = {
  loading: true,
  list: [],
}

export const notificationStore = createStore<NotificationState>(
  'notification',
  initState
)((get, set) => {
  return {
    async *getNotifications(state) {
      yield { loading: true, notifications: state.list }
      const res = await notificationsApi.getNotifications()

      if (res.error) {
        toastStore.error('Failed to retrieve notifications')
        return { loading: false, list: state.list }
      } else if (res.result) {
        return { loading: false, list: res.result.notifications }
      } else {
        return { loading: false, list: [] }
      }
    },

    async createNotification(_, notification: NotificationData) {
      const res = await notificationsApi.createNotification(notification)

      if (res.error) {
        toastStore.error('Failed to send notification')
      }
    },

    receiveNotification(state, notification: NotificationData) {
      toastStore.normal(`Notification: ${notification.text}`)
      return { list: [notification, ...state.list] }
    },
  }
})

subscribe('notification-created', { notification: { text: 'string', link: 'string?' } }, (body) => {
  notificationStore.receiveNotification(body.notification)
  toastStore.normal(`Notification: ${body.notification.text}`)
})