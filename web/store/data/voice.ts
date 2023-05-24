import { AppSchema } from '../../../srv/db/schema'
import { VoiceSettings, TTSService } from '../../../srv/db/texttospeech-schema'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { loadItem } from './storage'

type GenerateOpts = {
  chatId?: string
  messageId?: string
  text: string
  voice: VoiceSettings
  culture?: string
}

export const voiceApi = {
  voicesList,
  textToSpeech,
}

async function voicesList(ttsService: TTSService) {
  const user = getUserEntity()
  const res = await api.post<{ voices: AppSchema.VoiceDefinition[] }>(
    `/voice/${ttsService}/voices`,
    { user, ttsService }
  )
  return res
}

async function textToSpeech({ chatId, messageId, text, voice, culture }: GenerateOpts) {
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

function getUserEntity() {
  if (isLoggedIn()) {
    const { user } = getStore('user').getState()
    return user
  }
  const user = loadItem('config')
  return user
}
