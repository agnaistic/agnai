import * as chatApi from './chats'
import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '/common/types'

type NewRelation = Exclude<AppSchema.Relation, '_id' | 'kind'>

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

export async function inviteRelation(userId: string, relationId: string) {
  const existing = await getSpecificRelation(userId, relationId)
  if (!existing) {
    // const chat = await chatApi.create()
    const relation: AppSchema.Relation = {
      _id: v4(),
    }
  }

  if (existing?.state === 'accepted' || existing?.state === 'pending') return
}
