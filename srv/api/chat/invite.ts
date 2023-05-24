import { assertValid } from 'frisker'
import { store } from '../../db'
import { AppRequest, StatusError, errors, handle } from '../wrap'
import { sendMany, sendOne } from '../ws'
import { notificationDispatch } from '../../notification-dispatch'

export const getInvites = handle(async (req) => {
  const { sent, received, chats, characters, profiles } = await store.invites.list(req.userId!)

  return { sent, received, chats, chars: characters, profiles }
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
  const { invite, chat, profile, userId } = await loadInvite(req)
  const member = await store.invites.addMember(chat._id, invite.invitedId)
  await store.invites.deleteInvite(userId, invite._id)
  sendMany([chat.userId, ...chat.memberIds], {
    type: 'member-added',
    chatId: chat._id,
    profile,
  })
  notificationDispatch(invite.byUserId, {
    text: `User accepted your chat invite`,
    link: `/chat/${invite.chatId}`,
  })
  return member
})

export const rejectInvite = handle(async (req) => {
  const userId = req.userId!
  const invite = await store.invites.getInvite(userId, req.params.inviteId)
  if (invite) {
    await store.invites.deleteInvite(userId, invite._id)
    notificationDispatch(invite.byUserId, {
      text: 'User rejected your invite',
      link: `/invites`,
    })
  }
  return { success: true }
})

export const cancelInvite = handle(async (req) => {
  await store.invites.deleteInvite(req.userId, req.params.inviteId)
  return { success: true }
})

export const uninviteMember = handle(async (req) => {
  const chatId = req.params.id
  assertValid({ userId: 'string' }, req.body)

  await store.invites.removeMember(chatId, req.userId, req.body.userId)
  notificationDispatch(req.body.userId, {
    text: 'User uninvited you from the chat',
    link: `/invites`,
  })
  return { success: true }
})

async function loadInvite(req: AppRequest) {
  const inviteId = req.params.inviteId
  const invite = await store.invites.getInvite(req.userId!, inviteId)
  if (!invite) {
    throw errors.NotFound
  }
  if (invite.state !== 'pending') {
    // Non-pending invites should be deleted and/or not displayed to the user
    throw new StatusError('Invitation already actioned', 400)
  }
  const userId = req.userId
  if (!userId) {
    throw errors.Unauthorized
  }
  if (userId != invite.invitedId && userId !== invite.byUserId) {
    throw errors.Forbidden
  }
  const chat = await store.chats.getChat(invite.chatId)
  if (!chat) {
    await store.invites.deleteInvite(userId, invite._id)
    throw new StatusError('Chat no longer exists', 400)
  }
  const profile = await store.users.getProfile(invite.byUserId)
  if (!profile) {
    await store.invites.deleteInvite(invite.byUserId, invite._id)
    throw new StatusError('User no longer exists', 400)
  }
  return { invite, chat, profile, userId }
}
