import { api, isLoggedIn } from '../api'
import { NewNotification } from '../notification'
import { local } from './storage'

export const notificationsApi = {
  getNotifications,
  createNotification,
}

async function getNotifications() {
  if (isLoggedIn()) {
    const res = await api.get('/notifications')
    return res
  }

  return local.result([])
}

async function createNotification(notification: NewNotification) {
  if (isLoggedIn()) {
    const res = await api.post('/notifications', notification)
    return res
  }

  return local.result({ success: false })
}
