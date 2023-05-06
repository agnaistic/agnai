import {
  TextToSpeechAdapterResponse,
  TextToSpeechHandler,
  TextToSpeechRequest,
  VoiceListResponse,
  VoicesListRequest,
} from './types'
import { AppLog } from '../logger'
import { store } from '../db'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { sendGuest, sendMany } from '../api/ws'
import { StatusError } from '../api/wrap'
import { elevenlabsHandler } from './elevenlabs'
import { webSpeechSynthesisHandler } from './webspeechsynthesis'
import { TTSService } from '../db/texttospeech-schema'

export async function getVoicesList(
  { user, ttsService }: VoicesListRequest,
  log: AppLog,
  guestId?: string
): Promise<VoiceListResponse> {
  const service = getVoiceService(ttsService)
  try {
    return { voices: await service.getVoices(user, guestId) }
  } catch (ex: any) {
    throw new StatusError(ex.message, 500)
  }
}

export async function generateVoice(
  { user, chatId, messageId, voice, culture, ...opts }: TextToSpeechRequest,
  log: AppLog,
  guestId?: string
) {
  if (user.texttospeech?.enabled === false) {
    throw new StatusError('Text to speech is disabled', 400)
  }

  const service = getVoiceService(voice.service)
  const broadcastIds: string[] = []

  if (!guestId) {
    broadcastIds.push(user._id)
    const members = await store.chats.getActiveMembers(chatId)
    broadcastIds.push(...members, user._id)
  }

  let audio: TextToSpeechAdapterResponse | undefined
  let output: string = ''
  let error: any
  const text = processText(opts.text, user.texttospeech?.filterActions || true)

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
    output = await saveFile(`temp-${v4()}.${audio.ext}`, audio.content, 300)
  } catch (ex: any) {
    send(broadcastIds, guestId, {
      type: 'voice-failed',
      chatId,
      messageId,
      error: `Failed to save generated audio file: ${ex.message}`,
    })
    return { output: undefined }
  }

  send(broadcastIds, guestId, { type: 'voice-generated', chatId, messageId, url: output })

  return { output }
}

export function getVoiceService(ttsService?: TTSService): TextToSpeechHandler {
  switch (ttsService) {
    case 'webspeechsynthesis':
      return webSpeechSynthesisHandler

    case 'elevenlabs':
      return elevenlabsHandler

    default:
      throw new StatusError(`Invalid voice service: ${ttsService}`, 400)
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
    text = text.replace(filterActionsRegex, '...')
  }
  return text
}
