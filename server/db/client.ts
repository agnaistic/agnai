import PouchDB from 'pouchdb'
import { config } from '../config'
import { AllDoc, Doc } from './schema'

PouchDB.plugin(require('pouchdb-find'))

const client = new PouchDB<AllDoc>('db/' + config.db.name, {})

export function db<T extends AllDoc['kind'] = AllDoc['kind']>(_kind?: T) {
  return client as PouchDB.Database<Doc<T>>
}

export function catchErr(err?: any): null {
  return null
}

export async function createIndexes() {
  await client.createIndex({
    index: {
      name: 'chat',
      fields: ['kind', 'name', 'characterId'],
      partial_filter_selector: {
        kind: 'chat',
      },
    },
  })

  await client.createIndex({
    index: {
      name: 'character',
      fields: ['kind', 'name'],
      partial_filter_selector: {
        kind: 'character',
      },
    },
  })

  await client.createIndex({
    index: {
      name: 'chat-message',
      fields: ['kind', 'chatId'],
      partial_filter_selector: {
        kind: 'character',
      },
    },
  })
}
