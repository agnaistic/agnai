import Nedb from 'nedb-promises'
import { config } from '../config'
import { AllDoc, Doc } from './schema'

const client = Nedb.create({ filename: 'db/agn.db' }) as Nedb<AllDoc>

export function db<T extends AllDoc['kind'] = AllDoc['kind']>(_kind?: T) {
  return client as Nedb<Doc<T>>
}

export function catchErr(err?: any): null {
  return null
}

export async function createIndexes() {
  await client.ensureIndex({
    fieldName: 'kind',
  })

  await client.ensureIndex({
    fieldName: 'chatId',
    sparse: true,
  })
}
