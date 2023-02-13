import PouchDB from 'pouchdb'
import { config } from '../config'
import { AllDoc, Doc } from './schema'

const client = new PouchDB<AllDoc>('db/' + config.db.name, {})

export function db<T extends AllDoc['kind'] = AllDoc['kind']>(kind?: T) {
  return client as PouchDB.Database<Doc<T>>
}

export function catchErr(err?: any): null {
  return null
}
