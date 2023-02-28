import { assertValid } from 'frisker'
import { store } from '../../db'
import { handle } from '../wrap'
import { publishOne } from '../ws/handle'

export const getInvites = handle(async (req) => {
  const invites = await store.invites.list(req.userId!)
  return { invites }
})

export const createInvite = handle(async (req) => {
  const chatId = req.params.id
  assertValid({ userId: 'string' }, req.body)

  const invite = await store.invites.create({
    byUserId: req.userId!,
    chatId,
    invitedId: req.body.userId,
  })

  publishOne(req.body.userId, { type: 'invite-created', invite })
  return invite
})

export const acceptInvite = handle(async (req) => {
  const inviteId = req.params.inviteId

  const member = await store.invites.answer(req.userId!, inviteId, true)
  return member
})

export const rejectInvite = handle(async (req) => {
  const inviteId = req.params.inviteId

  const member = await store.invites.answer(req.userId!, inviteId, false)
  return member
})
