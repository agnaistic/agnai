import { Router } from 'express'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle } from './wrap'
import { assertValid } from 'frisker'
import { sendOne } from './ws'

const router = Router()

router.use(loggedIn)

const maxNotifications = 100

const getNotifications = handle(async ({ userId }) => {
  if (!userId) throw errors.Forbidden
  const notifications = await store.notifications.getNotifications(userId)
  return { notifications }
})

const selfNotifications = handle(async ({ body, userId }) => {
  if (!userId) throw errors.Forbidden
  assertValid(
    {
      text: 'string',
      link: 'string',
    },
    body,
    true
  )

  const count = await store.notifications.getNotificationsCount(userId)

  if (count > maxNotifications) {
    await store.notifications.trimNotifications(userId, maxNotifications)
  }

  const notification = await store.notifications.createNotification({
    userId: userId,
    text: body.text,
    link: body.link,
  })

  sendOne(userId, { type: 'notification-created', notification })

  return { success: true }
})

const deleteNotification = handle(async ({ params, userId }) => {
  if (!userId) throw errors.Forbidden
  const id = params.id
  await store.notifications.deleteNotification(userId, id)
  return { success: true }
})

const deleteAllNotifications = handle(async ({ params, userId }) => {
  if (!userId) throw errors.Forbidden
  await store.notifications.deleteAllNotifications(userId)
  return { success: true }
})

router.get('/', getNotifications)
router.post('/', selfNotifications)
router.delete('/:id', deleteNotification)
router.delete('/', deleteAllNotifications)

export default router
