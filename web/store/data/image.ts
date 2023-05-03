import * as horde from '../../../common/horde-gen'
import { createImagePrompt } from '../../../common/image-prompt'
import { api, isLoggedIn } from '../api'
import { getPromptEntities } from './messages'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  onDone: (image: string) => void
}

export const imageApi = {
  generateImage,
}

export async function generateImage({ chatId, messageId, onDone, ...opts }: GenerateOpts) {
  const entities = await getPromptEntities()
  const prompt = opts.prompt ? opts.prompt : await createImagePrompt(entities)

  if (!isLoggedIn()) {
    const image = await horde.generateImage(entities.user, prompt)
    onDone(image)
  }

  const res = await api.post<{ success: boolean }>(`/chat/${chatId || entities.chat._id}/image`, {
    prompt,
    user: entities.user,
    messageId,
    ephemeral: opts.ephemeral,
  })
  return res
}
