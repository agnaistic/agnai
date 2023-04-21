import { api, isLoggedIn } from '../api'
import { NotificationData } from '../notification'
import { localApi } from './storage'

export const notificationsApi = {
  getNotifications,
  createNotification,
}

async function getNotifications() {
  if (isLoggedIn()) {
    const res = await api.get('/notifications')
    return res
  }

  return localApi.result([])
}

async function createNotification(notification: NotificationData) {
  if (isLoggedIn()) {
    const res = await api.post('/notifications', notification)
    return res
  }

  return localApi.result({ success: false })
}
