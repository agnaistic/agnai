import * as horde from '../../../common/horde-gen'
import { createImagePrompt } from '../../../common/image-prompt'
import { api, isLoggedIn } from '../api'
import { getPromptEntities } from './messages'

export async function generateImage(
  messageId: string | undefined,
  onGenerated: (image: string) => void
) {
  const entities = await getPromptEntities()
  const prompt = createImagePrompt(entities)

  if (!isLoggedIn()) {
    const image = await horde.generateImage(entities.user, prompt)
    onGenerated(image)
  }

  const res = await api.post<{ success: boolean }>(`/chat/${entities.chat._id}/image`, {
    prompt,
    user: entities.user,
    messageId,
  })
  return res
}
