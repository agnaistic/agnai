import { assertValid } from 'frisker'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { handle } from '../wrap'
import { publishOne } from '../ws/handle'

export const getInvites = handle(async (req) => {
  const { invites, relations } = await store.invites.list(req.userId!)

  const chats: Record<string, AppSchema.Chat> = {}
  const chars: Record<string, AppSchema.Character> = {}
  const profiles: Record<string, AppSchema.Profile> = {}

  for (const rel of relations) {
    switch (rel.kind) {
      case 'chat':
        chats[rel._id] = rel
        continue

      case 'character':
        chars[rel._id] = rel
        continue

      case 'profile':
        profiles[rel.userId] = rel
        continue
    }
  }

  return { invites, chats, chars, profiles }
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
