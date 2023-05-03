import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { loadItem } from './storage'

type GenerateOpts = {
  chatId?: string
  messageId?: string
  text: string
  voiceBackend: AppSchema.VoiceBackend
  voiceId: string
}

export const voiceApi = {
  voicesList,
  textToSpeech,
}

export async function voicesList(voiceBackend: AppSchema.VoiceBackend) {
  const user = getUserEntity()
  const res = await api.post<{ voices: AppSchema.VoiceDefinition[] }>(
    `/voice/${voiceBackend}/voices`,
    {
      user,
      voiceBackend,
    }
  )
  return res
}

export async function textToSpeech({
  chatId,
  messageId,
  text,
  voiceBackend,
  voiceId,
}: GenerateOpts) {
  const user = getUserEntity()
  const res = await api.post<{ success: boolean }>(`/chat/${chatId}/voice`, {
    user,
    messageId,
    text,
    voiceBackend,
    voiceId,
  })
  return res
}

export async function getUserEntity() {
  if (isLoggedIn()) {
    const { user } = getStore('user').getState()
    return user
  }
  const user = loadItem('config')
  return user
}
