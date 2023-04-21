import { Router } from 'express'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle } from './wrap'
import { assertValid } from 'frisker'
import { sendOne } from './ws'

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
      link: 'string?',
    },
    body,
    true
  )

  const notification = await store.notifications.createNotification({
    userId: userId,
    text: body.text,
    link: body.link,
  })

  sendOne(userId, { type: 'notification-created', notification })

  return { success: true }
})

router.get('/', getNotifications)
router.post('/', selfNotifications)

export default router
