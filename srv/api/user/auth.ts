import { assertValid } from '/common/valid'
import { store } from '../../db'
import { handle, StatusError } from '../wrap'

export const register = handle(async (req) => {
  assertValid({ handle: 'string', username: 'string', password: 'string' }, req.body)
  const { profile, token, user } = await store.users.createUser(req.body)
  req.log.info({ user: user.username, id: user._id }, 'User registered')
  return { profile, token, user }
})

export const login = handle(async (req) => {
  assertValid({ username: 'string', password: 'string' }, req.body)
  const result = await store.users.authenticate(req.body.username.trim(), req.body.password)

  if (!result) {
    throw new StatusError('Unauthorized', 401)
  }

  return result
})

export const changePassword = handle(async (req) => {
  assertValid({ password: 'string' }, req.body)
  await store.admin.changePassword({ username: req.user?.username!, password: req.body.password })
  return { success: true }
})
