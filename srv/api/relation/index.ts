import { wrap } from '../wrap'
import { store } from '/srv/db'

export const getRelations = wrap(async (req) => {
  const result = await store.relations.getRelations(req.userId)
  return result
})

export const inviteRelation = wrap(async (req) => {})
