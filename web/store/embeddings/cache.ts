import * as lf from 'localforage'
import { EmbeddedDocument } from './types'
import { v4 } from 'uuid'

const CACHE_KEY = `agnai-documents`

export const docCache = {
  getIds: getCachedIds,
  getDoc: getDocument,
  saveDoc: saveDocument,
  deleteDoc: deleteDocument,
}

type DocumentId = { _id: string; name: string }

async function getCachedIds() {
  const json = (await lf.getItem(CACHE_KEY)) as string | null
  if (!json) return []

  const docs = JSON.parse(json)
  if (typeof docs[0] !== 'string') {
    return docs as Array<DocumentId>
  }

  const nextDocs: DocumentId[] = []

  for (const id of docs) {
    const doc = await lf.getItem(`${CACHE_KEY}_${id}`)
    if (!doc) continue

    const nextId = v4()
    await lf.setItem(`${CACHE_KEY}_${nextId}`, doc)
    await lf.removeItem(`${CACHE_KEY}_${id}`)
    nextDocs.push({ _id: nextId, name: id })
  }

  await lf.setItem(CACHE_KEY, JSON.stringify(nextDocs))
  return nextDocs as DocumentId[]
}

async function getDocument(id: string) {
  const ids = await getCachedIds()
  const json = (await lf.getItem(`${CACHE_KEY}_${id}`)) as string | null

  // If the document isn't cached, remove it from our ID list
  if (!json) {
    const match = ids.find((docId) => docId._id === id)
    if (!match) return

    const next = ids.filter((i) => i._id !== id)
    await lf.setItem(CACHE_KEY, JSON.stringify(next))
    return
  }

  const parsed = JSON.parse(json) as EmbeddedDocument

  // Migration: Storing the name separately to allow renaming
  if (parsed.name === undefined) {
    parsed.name = parsed.documentId
    parsed.documentId = id
    await lf.setItem(`${CACHE_KEY}_${id}`, JSON.stringify(parsed))
  }

  return parsed
}

async function saveDocument(id: string, doc: EmbeddedDocument) {
  const ids = await getCachedIds()

  const match = ids.find((i) => i._id === id)

  if (!match) {
    ids.push({ _id: id, name: doc.name })
    await lf.setItem(CACHE_KEY, JSON.stringify(ids))
  }

  await lf.setItem(`${CACHE_KEY}_${id}`, JSON.stringify(doc))

  const nextIds = ids.map<DocumentId>((entry) =>
    entry._id === id ? { _id: id, name: doc.name } : entry
  )
  await lf.setItem(CACHE_KEY, JSON.stringify(nextIds))
}

async function deleteDocument(docId: string) {
  const ids = await getCachedIds()
  const nextIds = ids.filter((doc) => doc._id !== docId)
  await lf.setItem(CACHE_KEY, JSON.stringify(nextIds))
  await lf.removeItem(`${CACHE_KEY}_${docId}`)
  return nextIds
}
