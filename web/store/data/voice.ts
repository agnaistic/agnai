import { AppSchema } from '../../../srv/db/schema'
import { CharacterVoiceSettings, TextToSpeechBackend } from '../../../srv/db/texttospeech-schema'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { loadItem } from './storage'

type GenerateOpts = {
  chatId?: string
  messageId?: string
  text: string
  voice: CharacterVoiceSettings
  culture?: string
}

export const voiceApi = {
  voicesList,
  textToSpeech,
}

export async function voicesList(ttsBackend: TextToSpeechBackend) {
  const user = getUserEntity()
  const res = await api.post<{ voices: AppSchema.VoiceDefinition[] }>(
    `/voice/${ttsBackend}/voices`,
    {
      user,
      ttsBackend,
    }
  )
  return res
}

export async function textToSpeech({ chatId, messageId, text, voice, culture }: GenerateOpts) {
  const user = getUserEntity()
  const res = await api.post<{ success: boolean }>(`/chat/${chatId}/voice`, {
    user,
    messageId,
    text,
    voice,
    culture,
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
