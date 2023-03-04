import { Db, MongoClient } from 'mongodb'
import { config } from '../config'
import { logger } from '../logger'
import { AllDoc, Doc } from './schema'

const uri = `mongodb://${config.db.host}:${config.db.port}`

logger.info({ uri }, 'MongoDB URI')
let database: Db | null = null

export async function connect() {
  const cli = new MongoClient(uri, { ignoreUndefined: true })
  await cli.connect()
  database = cli.db(config.db.name)

  // const conn = await MongoClient.connect(uri, { ignoreUndefined: true })
  // database = conn.db(config.db.name)

  logger.info('Connected to MongoDB')
  return database
}

export function getDb() {
  if (!database) throw new Error('Database not yet initialised')
  return database!
}

export function db<T extends AllDoc['kind']>(kind: T) {
  return getDb().collection<Doc<T>>(kind)
}

// export function db<T extends AllDoc['kind'] = AllDoc['kind']>(_kind?: T) {
//   return client as Nedb<Doc<T>>
// }

export function catchErr(err?: any): null {
  return null
}

export async function createIndexes() {
  // await client.ensureIndex({ fieldName: 'username' })
  // await client.ensureIndex({
  //   fieldName: 'kind',
  // })
  // await client.ensureIndex({
  //   fieldName: 'chatId',
  //   sparse: true,
  // })
}
