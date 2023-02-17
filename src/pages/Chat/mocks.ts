import { AppSchema } from '../../../server/db/schema'

export const mockMessages: AppSchema.ChatMessage[] = [
  {
    kind: 'chat-message',
    _id: '1',
    msg: 'Hi Robot',
    sent: new Date().toISOString(),
    charId: '#',
  },
]
