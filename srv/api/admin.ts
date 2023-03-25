import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { isAdmin, loggedIn } from './auth'
import { handle } from './wrap'
import { getLiveCounts } from './ws/bus'

const router = Router()

router.use(loggedIn, isAdmin)

const getUsers = handle(async (req) => {
  const users = await store.admin.getUsers()
  return { users: users.map((u) => ({ ...u, hash: undefined })) }
})

const setUserPassword = handle(async (req) => {
  assertValid({ username: 'string', password: 'string' }, req.body)
  await store.admin.changePassword(req.body)
  return { success: true }
})

const getUserInfo = handle(async ({ params }) => {
  const info = await store.admin.getUserInfo(params.id)
  return info
})

const getMetrics = handle(async () => {
  const counts = getLiveCounts()
  const metrics = await store.users.getMetrics()

  const connected = counts.map((count) => count.count).reduce((prev, curr) => prev + curr, 0)

  return {
    ...metrics,
    connected,
    each: counts.map((count) => ({ ...count, date: count.date.toISOString() })),
  }
})

router.get('/users', getUsers)
router.get('/metrics', getMetrics)
router.get('/users/:id/info', getUserInfo)
router.post('/user/password', setUserPassword)

export default router
