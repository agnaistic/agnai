import { Router } from 'express'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { isAdmin, loggedIn } from './auth'
import { handle } from './wrap'
import { getLiveCounts, sendAll } from './ws/bus'

const router = Router()

router.use(loggedIn, isAdmin)

const searchUsers = handle(async (req) => {
  const { body } = req
  assertValid({ username: 'string?', page: 'number?' }, body)
  const users = await store.admin.getUsers({ username: body.username, page: body.page })
  return { users: users.map((u) => ({ ...u, hash: undefined })) }
})

const setUserPassword = handle(async (req) => {
  assertValid({ userId: 'string', password: 'string' }, req.body)
  await store.admin.changePassword({ userId: req.body.userId, password: req.body.password })
  return { success: true }
})

const getUserInfo = handle(async ({ params }) => {
  const info = await store.admin.getUserInfo(params.id)
  return info
})

const notifyAll = handle(async ({ body }) => {
  assertValid({ message: 'string' }, body)
  sendAll({ type: 'admin-notification', message: body.message })

  return { success: true }
})

const getMetrics = handle(async () => {
  const { entries: counts, maxLiveCount } = getLiveCounts()
  const metrics = await store.users.getMetrics()

  const connected = counts.map((count) => count.count).reduce((prev, curr) => prev + curr, 0)

  const threshold = Date.now() - 30000
  return {
    ...metrics,
    connected,
    maxLiveCount,
    each: counts.filter((c) => c.date.valueOf() >= threshold),
  }
})

router.post('/users', searchUsers)
router.get('/metrics', getMetrics)
router.get('/users/:id/info', getUserInfo)
router.post('/user/password', setUserPassword)
router.post('/notify', notifyAll)

export default router
