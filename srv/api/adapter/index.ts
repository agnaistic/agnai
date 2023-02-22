import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { handleKobold } from './kobold'
import { handleNovel } from './novel'

type ResponseOptions = {
  adapter: AppSchema.ChatAdapter
  chat: AppSchema.Chat
  char: AppSchema.Character
  history: AppSchema.ChatMessage[]
  message: string
}

export async function generateResponse(opts: ResponseOptions) {
  if (!opts.adapter || opts.adapter === 'none') {
    throw new Error(`No adapter set`)
  }

  const settings = await store.settings.get()

  switch (opts.adapter) {
    case 'novel':
      return handleNovel({ ...opts, settings })

    case 'kobold':
    default: {
      return handleKobold({ ...opts, settings })
    }
  }
}
