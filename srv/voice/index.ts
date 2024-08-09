import {
  TextToSpeechAdapterResponse,
  TextToSpeechHandler,
  TextToSpeechRequest,
  VoiceListResponse,
  VoiceModelListResponse,
  VoiceModelsListRequest,
  VoicesListRequest,
} from './types'
import { AppLog } from '../middleware'
import { store } from '../db'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { sendGuest, sendMany } from '../api/ws'
import { StatusError } from '../api/wrap'
import { elevenlabsHandler } from './elevenlabs'
import { novelTtsHandler } from './novel'
import { webSpeechSynthesisHandler } from './webspeechsynthesis'
import { TTSService, VoiceSettings } from '../../common/types/texttospeech-schema'
import { AppSchema } from '../../common/types/schema'
import { agnaiTtsHandler } from './agnai'

export async function getVoicesList(
  { user, ttsService }: VoicesListRequest,
  log: AppLog,
  guestId?: string
): Promise<VoiceListResponse> {
  const service = getVoiceService(ttsService)
  if (!service) return { voices: [] }

  try {
    return { voices: await service.getVoices(user, guestId) }
  } catch (ex: any) {
    log.error({ err: ex }, 'Failed to retrieve voice list')
    throw new StatusError(ex.message, 500)
  }
}

export async function getModelsList(
  { user, ttsService }: VoiceModelsListRequest,
  log: AppLog,
  guestId?: string
): Promise<VoiceModelListResponse> {
  const service = getVoiceService(ttsService)
  if (!service) return { models: [] }

  try {
    return { models: await service.getModels(user, guestId) }
  } catch (ex: any) {
    log.error({ err: ex }, 'Failed to retrieve model list')
    throw new StatusError(ex.message, 500)
  }
}

export async function generateTextToSpeech(
  user: AppSchema.User,
  log: AppLog,
  guestId: string | undefined,
  text: string,
  voice: VoiceSettings
) {
  const service = getVoiceService(voice.service)
  if (!service) return { output: undefined }

  let audio: TextToSpeechAdapterResponse | undefined
  let output: string = ''
  const processedText = processText(text, user.texttospeech?.filterActions ?? true)

  try {
    audio = await service.generateVoice({ user, text: processedText, voice }, log, guestId)
  } catch (ex: any) {
    log.error({ err: ex }, 'Failed to generate audio')
    throw new StatusError(`Could not generate audio: ${ex.message || ex}`, 400)
  }

  if (!audio) {
    return { output }
  }

  try {
    if (audio.ext === 'url') {
      output = audio.content.toString()
    } else {
      output = await saveFile(`temp-${v4()}.${audio.ext}`, audio.content, 300)
    }
  } catch (ex: any) {
    log.error({ err: ex }, 'Failed to generate audio')
    throw new StatusError(`Could not generate audio: ${ex.message || ex}`, 500)
  }

  return { output }
}

export async function generateVoice(
  { user, chatId, messageId, voice, culture, ...opts }: TextToSpeechRequest,
  log: AppLog,
  guestId?: string
) {
  const service = getVoiceService(voice.service)
  if (!service) return { output: undefined }

  const broadcastIds: string[] = []

  if (!guestId) {
    broadcastIds.push(user._id)
    const members = await store.chats.getActiveMembers(chatId)
    broadcastIds.push(...members, user._id)
  }

  let audio: TextToSpeechAdapterResponse | undefined
  let output: string = ''
  let error: any
  const text = processText(opts.text, user.texttospeech?.filterActions ?? true)

  log.debug({ text, service: voice.service }, 'Text to speech')

  const generatingMessage = { chatId, messageId, type: 'voice-generating' }
  if (broadcastIds.length) {
    sendMany(broadcastIds, generatingMessage)
  } else if (guestId) {
    sendGuest(guestId, generatingMessage)
  }

  try {
    audio = await service.generateVoice({ user, text, voice }, log, guestId)
  } catch (ex: any) {
    error = ex.message || ex
    log.error({ err: ex }, 'Failed to generate audio')
  }

  if (!audio) {
    error = `Failed to generate audio: ${
      error || 'Invalid text to speech settings (No handler found)'
    }`
    send(broadcastIds, guestId, {
      type: 'voice-failed',
      chatId,
      messageId,
      error,
    })
    return { output: undefined }
  }

  try {
    if (audio.ext === 'url') {
      output = audio.content.toString()
    } else {
      output = await saveFile(`temp-${v4()}.${audio.ext}`, audio.content, 300)
    }
  } catch (ex: any) {
    send(broadcastIds, guestId, {
      type: 'voice-failed',
      chatId,
      messageId,
      error: `Failed to save generated audio file: ${ex.message}`,
    })
    return { output: undefined }
  }

  send(broadcastIds, guestId, {
    type: 'voice-generated',
    chatId,
    messageId,
    url: output,
    rate: voice.rate,
  })

  return { output }
}

export function getVoiceService(ttsService?: TTSService): TextToSpeechHandler | undefined {
  switch (ttsService) {
    case 'webspeechsynthesis':
      return webSpeechSynthesisHandler

    case 'elevenlabs':
      return elevenlabsHandler

    case 'novel':
      return novelTtsHandler

    case 'agnaistic':
      return agnaiTtsHandler

    default:
      return
  }
}

function send(broadcastIds: string[], guestId: string | undefined, message: any) {
  if (broadcastIds.length) {
    sendMany(broadcastIds, message)
  } else if (guestId) {
    sendGuest(guestId, message)
  }
}

const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
function processText(text: string, filterActions: boolean) {
  if (!text) return ''
  text = text.trim()
  if (filterActions) {
    text = text.replace(filterActionsRegex, '')
  }
  text = text
    .replace(/[~]/g, ' ')
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ''
    )
    .replace(/\n+/g, ' ')
  // .replace(/ +/g, ' ')
  return text
}
