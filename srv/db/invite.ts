/**
 * @TODO
 * Invites should be event sourced
 * For now I'm going to remove accepted and rejected invites
 *
 * Once event sourced, I'll support blocking users and will have an audit trail of all invites
 */

import { v4 } from 'uuid'
import { errors, StatusError } from '../api/wrap'
import { sendMany } from '../api/ws'
import { getChatOnly } from './chats'
import { db } from './client'
import { AppSchema } from './schema'

export type NewInvite = {
  chatId: string
  byUserId: string
  invitedId: string
}

export async function list(userId: string) {
  const invites = await db('chat-invite')
    .find({ kind: 'chat-invite', $or: [{ invitedId: userId }, { byUserId: userId }] })
    .toArray()

  const userIds = Array.from(new Set(invites.flatMap((i) => [i.byUserId, i.invitedId]))).filter(
    (id) => id !== userId
  )
  const chatIds = Array.from(new Set(invites.map((i) => i.chatId)))
  const characterIds = Array.from(new Set(invites.map((i) => i.characterId)))

  const [profiles, chats, characters] = await Promise.all([
    db('profile')
      .find({ userId: { $in: userIds } })
      .toArray(),
    db('chat')
      .find({ _id: { $in: chatIds } })
      .toArray(),
    db('character')
      .find({ _id: { $in: characterIds } })
      .toArray(),
  ])

  return {
    sent: invites.filter((i) => i.byUserId === userId),
    received: invites.filter((i) => i.invitedId === userId),
    profiles,
    chats,
    characters,
  }
}

export async function create(invite: NewInvite) {
  const chat = await getChatOnly(invite.chatId)
  if (chat?.userId !== invite.byUserId) {
    throw errors.Forbidden
  }

  if (invite.byUserId === invite.invitedId) {
    throw new StatusError(`Cannot invite yourself`, 400)
  }

  const user = await db('profile').findOne({ kind: 'profile', userId: invite.invitedId })
  if (!user) {
    throw new StatusError(`User does not exist`, 400)
  }

  const membership = await db('chat-member').findOne({
    kind: 'chat-member',
    chatId: invite.chatId,
    userId: invite.invitedId,
  })

  if (membership) {
    throw new StatusError(`User is already a member of this conversation`, 400)
  }

  const prev = await db('chat-invite').findOne({
    kind: 'chat-invite',
    chatId: invite.chatId,
    inviteId: invite.invitedId,
  })

  if (prev) throw new StatusError('Invite already pending', 400)

  const inv: AppSchema.ChatInvite = {
    _id: v4(),
    byUserId: invite.byUserId,
    chatId: invite.chatId,
    createdAt: new Date().toISOString(),
    invitedId: invite.invitedId,
    kind: 'chat-invite',
    characterId: chat.characterId,
    state: 'pending',
  }

  await db('chat-invite').insertOne(inv)
  return inv
}

export async function getInvite(userId: string, inviteId: string) {
  return await db('chat-invite').findOne({
    _id: inviteId,
    kind: 'chat-invite',
    invitedId: userId,
  })
}

export async function deleteInvite(userId: string, inviteId: string) {
  await db('chat-invite').deleteOne(
    { _id: inviteId, kind: 'chat-invite', $or: [{ invitedId: userId }, { byUserId: userId }] },
    {}
  )
}

export async function addMember(chatId: string, invitedId: string) {
  const member: AppSchema.ChatMember = {
    _id: v4(),
    kind: 'chat-member',
    chatId: chatId,
    createdAt: new Date().toISOString(),
    userId: invitedId,
  }

  await db('chat-member').insertOne(member)
  await db('chat').updateOne({ _id: chatId, kind: 'chat' }, { $addToSet: { memberIds: invitedId } })

  return member
}

export async function removeMember(chatId: string, requestedBy: string, memberId: string) {
  const chat = await db('chat').findOne({ _id: chatId })
  if (!chat) throw errors.NotFound

  if (chat.userId !== requestedBy) {
    throw errors.Forbidden
  }

  if (chat.memberIds.includes(memberId)) {
    sendMany([requestedBy, ...chat.memberIds], { type: 'member-removed', chatId, memberId })
  }

  await db('chat-member').deleteMany({ chatId, userId: memberId })
}
