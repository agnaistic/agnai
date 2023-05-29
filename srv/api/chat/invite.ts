import { assertValid } from '/common/valid'
import { store } from '../../db'
import { handle } from '../wrap'
import { sendOne } from '../ws'

export const getInvites = handle(async (req) => {
  const { invites, chats, characters, profiles } = await store.invites.list(req.userId!)

  return { invites, chats, chars: characters, profiles }
})

export const createInvite = handle(async (req) => {
  // TODO: Invite limits. A user should only have a max of 10 invitations pending.

  const chatId = req.params.id
  assertValid({ userId: 'string' }, req.body)

  const invite = await store.invites.create({
    byUserId: req.userId!,
    chatId,
    invitedId: req.body.userId,
  })

  if (!invite) return { success: false }

  sendOne(req.body.userId, { type: 'invite-created', invite })
  return invite
})

export const acceptInvite = handle(async (req) => {
  const inviteId = req.params.inviteId

  const member = await store.invites.answer(req.userId!, inviteId, true)
  return member
})

export const rejectInvite = handle(async (req) => {
  const inviteId = req.params.inviteId

  await store.invites.answer(req.userId!, inviteId, false)
  return { success: true }
})

export const uninviteMember = handle(async (req) => {
  const chatId = req.params.id
  assertValid({ userId: 'string' }, req.body)

  await store.invites.removeMember(chatId, req.userId, req.body.userId)
  return { success: true }
})
