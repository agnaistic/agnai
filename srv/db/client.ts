import { Db, MongoClient } from 'mongodb'
import { config } from '../config'
import { logger } from '../middleware'
import { AllDoc, Doc } from '../../common/types/schema'

const uri = config.db.uri || `mongodb://${config.db.host}:${config.db.port}`
let connected = false
let retrying = false

let database: Db | null = null

export async function connect(verbose = false) {
  if (!config.db.uri && !config.db.host) {
    logger.info(`No MongoDB host provided: Running in anonymous-only mode`)
    return
  }

  retrying = false
  const cli = new MongoClient(uri, { ignoreUndefined: true })
  try {
    const timer = setTimeout(() => cli.close(), 10000)
    await cli.connect()
    clearTimeout(timer)

    database = cli.db(config.db.name)

    const onClose = (event: string) => () => {
      if (retrying) return
      retrying = true
      connected = false
      logger.warn({ cause: event }, 'MongoDB disconnected. Retrying...')
      setTimeout(connect, 5000)
    }

    cli.on('connectionPoolCleared', onClose('connectionPoolCleared'))

    logger.info('Connected to MongoDB')
    connected = true
    return database
  } catch (ex) {
    logger.error({ err: ex }, `Could not connect to database: Running in anonymous-only mode`)
    setTimeout(() => connect(config.db.verbose), 5000)
  }
}

export function getDb() {
  if (!database) throw new Error('Database not yet initialised')
  return database!
}

export function db<T extends AllDoc['kind']>(kind: T) {
  return getDb().collection<Doc<T>>(kind)
}

export function catchErr(err?: any): null {
  return null
}

export function isConnected() {
  return connected
}

export async function createIndexes() {
  await db('chat-member').createIndex({ chatId: 1 }, { name: 'chat-messages_chatId' }) // This index name is a typo, but can't be changed due to already being shipped
  await db('chat-member').createIndex({ userId: 1 }, { name: 'chat-members_userId' })
  await db('profile').createIndex({ userId: 1 }, { name: 'profiles_userId' })

  await db('character').createIndex({ userId: 1 }, { name: 'characters_userId' })

  await db('chat').createIndex({ userId: 1 }, { name: 'chats_userId' })
  await db('chat').createIndex({ characterId: 1, userId: 1 }, { name: 'chats_characterId_userId' })

  await db('memory').createIndex({ userId: 1 }, { name: 'memory_userId' })

  await db('gen-setting').createIndex({ userId: 1 }, { name: 'gen-setting_userId' })

  await db('chat-message').createIndex({ chatId: 1 }, { name: 'chatmessages_chatId' })
  await db('chat-message').createIndex(
    { chatId: 1, kind: 1, createdAt: -1 },
    { name: 'chatmessages_chatId_kind_createdAt' }
  )

  await db('scenario').createIndex({ userId: 1 }, { name: 'scenario_userId' })

  await db('apikey').createIndex({ userId: 1 }, { name: 'apikey_userId' })
  await db('apikey').createIndex({ apikey: 1 }, { name: 'apikey_apikey' })
  await db('apikey').createIndex({ code: 1 }, { name: 'apikey_code' })

  await db('prompt-template').createIndex({ userId: 1 }, { name: 'prompt-templates_userId' })
  await db('configuration').createIndex(
    { kind: 1 },
    { unique: true, name: 'configuration_unique_kind' }
  )

  await db('user').createIndex({ username: 1 }, { name: 'user_username' })
  await db('user').createIndex({ kind: 1, username: 1 }, { name: 'user_kind_username' })
  await db('user').createIndex({ apiKey: 1 }, { name: 'user_apiKey' })
  await db('user').createIndex({ patreonUserId: 1 }, { name: 'user_patreonUserId' })
  await db('user').createIndex(
    { 'patreon.user.attributes.email': 1 },
    { name: 'user_patreonEmail' }
  )
  await db('user').createIndex({ 'google.sub': 1 }, { name: 'user_googleSub' })
  await db('user').createIndex({ 'google.email': 1 }, { name: 'user_googleEmail' })

  await db('saga-template').createIndex({ userId: 1 }, { name: 'saga-template_userId' })
  await db('saga-session').createIndex({ userId: 1 }, { name: 'saga-session_userId' })
  await db('saga-session').createIndex({ templateId: 1 }, { name: 'saga-session_templateId' })

  await db('chat-lock').createIndex({ kind: 1, chatLock: 1 }, { name: 'chat-lock_kind_chatlock' })
  await db('evtstore-events' as any).createIndex(
    { aggregateId: 1, stream: 1, position: 1 },
    { name: 'evtstore-events_aggId_stream_position' }
  )
}
