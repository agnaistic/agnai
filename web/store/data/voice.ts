import { api } from '../api'
import { getStore } from '../create'

type GenerateOpts = {
  chatId?: string
  messageId?: string
  text: string
}

export async function textToSpeech({ chatId, messageId, text }: GenerateOpts) {
  const user = getStore('user').getProfile()
  const res = await api.post<{ success: boolean }>(`/chat/${chatId}/voice`, {
    user,
    messageId,
    text,
  })
  return res
}
