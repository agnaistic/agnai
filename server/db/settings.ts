import { catchErr, db } from './client'
import { Doc } from './schema'

export async function get(): Promise<Doc<'settings'>> {
  const doc = await db('settings').get('settings').catch(catchErr)
  if (!doc) {
    const settings = { _id: 'settings', kind: 'settings', koboldUrl: '' } as const
    await db().put(settings)
    return get()
  }

  return doc
}

export async function save(update: Partial<Doc<'settings'>>) {
  const doc = await get()
  const next = { ...doc, ...update }
  await db().put(next)
  return get()
}
