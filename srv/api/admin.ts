import { Router } from 'express'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { isAdmin, loggedIn } from './auth'
import { StatusError, handle } from './wrap'
import { getLiveCounts, sendAll } from './ws/bus'

const router = Router()

router.use(loggedIn, isAdmin)

const searchUsers = handle(async (req) => {
  const { body } = req
  assertValid(
    { username: 'string?', page: 'number?', customerId: 'string?', subscribed: 'boolean?' },
    body
  )
  const users = await store.admin.getUsers({
    username: body.username,
    customerId: body.customerId,
    subscribed: body.subscribed,
    page: body.page,
  })

  return { users: users.map((u) => ({ ...u, hash: undefined })) }
})

const impersonateUser = handle(async (req) => {
  const userId = req.params.userId
  const user = await store.users.getUser(userId)
  if (!user) {
    throw new StatusError('User not found', 404)
  }

  const token = await store.users.createAccessToken(user.username, user)
  return { token }
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

const updateConfiguration = handle(async ({ body }) => {
  assertValid(
    {
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      policiesEnabled: 'boolean',
      termsOfService: 'string',
      privacyStatement: 'string',
      enabledAdapters: ['string'],
      imagesEnabled: 'boolean',
      imagesHost: 'string',
      imagesModels: ['any'],
      supportEmail: 'string',
    },
    body
  )

  const next = await store.admin.updateServerConfiguration({
    kind: 'configuration',
    privacyUpdated: '',
    tosUpdated: '',
    ...body,
  })

  return next
})

const updateTier = handle(async (req) => {
  assertValid({ tierId: 'string' }, req.body)
  await store.users.updateUserTier(req.params.userId, req.body.tierId)
  return { success: true }
})

router.post('/impersonate/:userId', impersonateUser)
router.post('/users', searchUsers)
router.post('/users/:userId/tier', updateTier)
router.get('/metrics', getMetrics)
router.get('/users/:id/info', getUserInfo)
router.post('/user/password', setUserPassword)
router.post('/notify', notifyAll)
router.post('/configuration', updateConfiguration)

export default router
