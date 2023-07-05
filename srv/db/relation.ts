import * as chatApi from './chats'
import * as inviteApi from './invite'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '/common/types'
import { now } from './util'
import { StatusError, errors } from '../api/wrap'
import { publishOne } from '../api/ws/handle'

export async function getSpecificRelation(userId: string, relatedTo: string) {
  const relation = await db('relation').findOne({
    $or: [
      { userId, relatedTo },
      { userId: relatedTo, relatedTo: userId },
    ],
  })

  return relation
}

export async function getRelations(userId: string) {
  const relations = await db('relation')
    .find({ $or: [{ userId }, { relatedTo: userId }] })
    .toArray()
  if (!relations.length) {
    return { relations: [], chats: [] }
  }

  const chats = await db('chat')
    .find({ _id: { $in: relations.map((r) => r.chatId) } })
    .toArray()
  return { relations, chats }
}

export async function inviteRelation(userId: string, otherUserId: string) {
  const existing = await getSpecificRelation(userId, otherUserId)
  if (!existing || existing.state === 'none') {
    const chat = await createRelationChat(userId)
    const relation: AppSchema.Relation = {
      _id: v4(),
      kind: 'relation',
      chatId: chat._id,
      userId,
      relatedTo: otherUserId,
      state: 'pending',
      createdAt: now(),
      updatedAt: now(),
    }

    await db('relation').insertOne(relation)
    publishOne(otherUserId, { type: 'relation-created', userId })
    return relation
  }

  if (existing?.state === 'accepted' || existing?.state === 'pending') return existing
  throw errors.Forbidden
}

export async function acceptRelation(relationId: string, acceptingUserId: string) {
  const relation = await db('relation').findOne({ _id: relationId, relatedTo: acceptingUserId })
  if (!relation || relation.state === 'none') {
    throw new StatusError(`Invitation request not found`, 404)
  }

  if (relation.state === 'accepted') return
  if (relation.state === 'blocked') {
    throw errors.Forbidden
  }

  await inviteApi.addChatMember(relation.chatId, acceptingUserId)
}

async function createRelationChat(userId: string) {
  const chat = await chatApi.create('', {
    name: 'Chat with ...',
    userId,
    mode: 'standard',
  })

  return chat
}
