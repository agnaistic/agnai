import { Router } from 'express'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle } from './wrap'
import { assertValid } from 'frisker'
import { notificationDispatch } from '../notification-dispatch'

const router = Router()

router.use(loggedIn)

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

  notificationDispatch(userId, body)

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
