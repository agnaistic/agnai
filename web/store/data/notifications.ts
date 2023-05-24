import { api, isLoggedIn } from '../api'
import { NewNotification } from '../notification'
import { localApi } from './storage'

export const notificationsApi = {
  getNotifications,
  createNotification,
  deleteNotification,
  deleteAllNotifications,
}

async function getNotifications() {
  if (isLoggedIn()) {
    const res = await api.get('/notifications')
    return res
  }

  return localApi.result([])
}

async function createNotification(notification: NewNotification) {
  if (isLoggedIn()) {
    const res = await api.post('/notifications', notification)
    return res
  }

  return localApi.result({ success: false })
}

async function deleteNotification(notificationId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/notifications/${notificationId}`)
    return res
  }

  return localApi.result({ success: false })
}

async function deleteAllNotifications() {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/notifications`)
    return res
  }

  return localApi.result({ success: false })
}
