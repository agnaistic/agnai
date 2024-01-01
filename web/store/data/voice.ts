import { AppSchema } from '../../../common/types/schema'
import { VoiceSettings, TTSService } from '../../../common/types/texttospeech-schema'
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
  modelsList,
  chatTextToSpeech,
  textToSpeech,
}

async function voicesList(ttsService: TTSService) {
  const user = getUserEntity()
  const res = await api.post<{ voices: AppSchema.VoiceDefinition[] }>(
    `/voice/${ttsService}/voices`,
    {
      user,
      ttsService,
    }
  )
  return res
}

async function modelsList(ttsService: TTSService) {
  const user = getUserEntity()
  const res = await api.post<{ models: AppSchema.VoiceModelDefinition[] }>(
    `/voice/${ttsService}/models`,
    {
      user,
      ttsService,
    }
  )
  return res
}

async function chatTextToSpeech({ chatId, messageId, text, voice, culture }: GenerateOpts) {
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

async function textToSpeech(text: string, voice: VoiceSettings) {
  const user = getUserEntity()
  const res = await api.post<{ output: string }>(`/voice/tts`, {
    user,
    text,
    voice,
  })
  if (res.result) return res.result
  else
    throw new Error(res.error ?? `An error occured generating text to speech with ${voice.service}`)
}

function getUserEntity() {
  if (isLoggedIn()) {
    const { user } = getStore('user').getState()
    return user
  }
  const user = loadItem('config')
  return user
}
