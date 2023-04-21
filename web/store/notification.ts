import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { notificationsApi } from './data/notifications'
import { toastStore } from './toasts'

type NotificationState = {
  loading: boolean
  list: AppSchema.Notification[]
}

export type NewNotification = Pick<AppSchema.Notification, 'text' | 'link'>

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

    async createNotification(_, notification: NewNotification) {
      const res = await notificationsApi.createNotification(notification)

      if (res.error) {
        toastStore.error('Failed to send notification')
      }
    },
  }
})
