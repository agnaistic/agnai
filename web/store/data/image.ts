import { createImagePrompt } from '../../../common/image-prompt'
import { api } from '../api'
import { getPromptEntities } from './messages'

export async function generateImage() {
  const entities = await getPromptEntities()
  const prompt = createImagePrompt(entities)

  const res = await api.post(`/chat/${entities.chat._id}/image`, { prompt, user: entities.user })
  return res
}
