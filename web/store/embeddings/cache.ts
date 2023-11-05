import * as lf from 'localforage'
import { CacheDocument } from './types'

const CACHE_KEY = `agnai-documents`

export const docCache = {
  getIds: getCachedIds,
  getDoc: getDocument,
  saveDoc: saveDocument,
  deleteDoc: deleteDocument,
}

async function getCachedIds() {
  const json = (await lf.getItem(CACHE_KEY)) as string | null
  if (!json) return []

  const docs = JSON.parse(json)
  return docs as string[]
}

async function getDocument(id: string) {
  const ids = await getCachedIds()
  const json = (await lf.getItem(`${CACHE_KEY}_${id}`)) as string | null
  if (!json) {
    if (!ids.includes(id)) return
    const next = ids.filter((i) => i !== id)
    await lf.setItem(CACHE_KEY, JSON.stringify(next))
    return
  }

  return JSON.parse(json) as CacheDocument
}

async function saveDocument(id: string, doc: CacheDocument) {
  const ids = await getCachedIds()

  if (!ids.includes(id)) {
    ids.push(id)
    await lf.setItem(CACHE_KEY, JSON.stringify(ids))
  }

  await lf.setItem(`${CACHE_KEY}_${id}`, JSON.stringify(doc))
}

async function deleteDocument(docId: string) {
  const ids = await getCachedIds()
  const nextIds = ids.filter((id) => id !== docId)
  await lf.setItem(CACHE_KEY, JSON.stringify(nextIds))
  await lf.removeItem(`${CACHE_KEY}_${docId}`)
  return nextIds
}
