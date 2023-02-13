import { db } from './client'

export async function ensureIndexes() {
  await db().createIndex({
    index: {
      name: 'chats',
      fields: ['chatId', 'createdAt', 'updatedAt'],
      partial_filter_selector: {
        kind: 'chat',
      },
    },
  })
}
