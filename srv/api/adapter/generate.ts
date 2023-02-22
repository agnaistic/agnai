import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { handleKobold } from './kobold'
import { handleNovel } from './novel'

export type GenerateOptions = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  history: AppSchema.ChatMessage[]
  message: string
  adapter?: AppSchema.ChatAdapter
}

export async function generateResponse(opts: GenerateOptions) {
  const settings = await store.settings.get()
  const adapter = opts.adapter || opts.chat.adapter || settings.defaultAdapter || 'kobold'

  switch (adapter) {
    case 'novel':
      return handleNovel({ ...opts, settings })

    case 'kobold':
    default: {
      return handleKobold({ ...opts, settings })
    }
  }
}
