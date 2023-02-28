import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { isAdmin, loggedIn } from './auth'
import { handle } from './wrap'

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

router.get('/users', getUsers)
router.post('/user/password', setUserPassword)

export default router
