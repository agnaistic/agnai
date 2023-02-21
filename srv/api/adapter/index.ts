import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { handleKobold } from './kobold'

export async function generateResponse(
  adapter: AppSchema.ChatAdapter,
  chat: AppSchema.Chat,
  char: AppSchema.Character,
  message: string,
  history: AppSchema.ChatMessage[]
) {
  if (!adapter || adapter === 'none') {
    throw new Error(`No adapter set`)
  }

  switch (adapter) {
    case 'kobold':
    default: {
      return handleKobold(chat, char, history, message)
    }
  }
}
