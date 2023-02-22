import { logger } from '../logger'
import { catchErr, db } from './client'
import { AppSchema, Doc } from './schema'

const sts = db('settings')

const defaults: AppSchema.Settings = {
  kind: 'settings',
  novelApiKey: '',
  koboldUrl: 'http://localhost:5000',
  chaiUrl: 'https://model-api-shdxwd54ta-nw.a.run.app/generate/gptj',
}

export async function get(): Promise<Doc<'settings'>> {
  const doc = await sts.findOne({ _id: 'settings' }).catch(catchErr)
  if (!doc) {
    const settings = { _id: 'settings', ...defaults } as const
    await db().insertOne(settings)
    logger.info('Database initialised')
    return get()
  }

  return { ...defaults, ...doc }
}

export async function save(update: Partial<Doc<'settings'>>) {
  await db().updateOne({ _id: 'settings' }, { $set: { ...update } })
  return get()
}
