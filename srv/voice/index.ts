import {
  TextToSpeechAdapterResponse,
  TextToSpeechRequest,
  VoiceListResponse,
  VoicesListRequest,
} from './types'
import { AppLog } from '../logger'
import { handleElevenLabsTextToSpeech, handleElevenLabsVoicesList } from './elevenlabs'
import { store } from '../db'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { sendGuest, sendMany } from '../api/ws'
import { StatusError } from '../api/wrap'

export async function getVoicesList(
  { user, voiceBackend }: VoicesListRequest,
  log: AppLog,
  guestId?: string
): Promise<VoiceListResponse> {
  let voicesList: VoiceListResponse['voices']
  try {
    switch (voiceBackend) {
      case 'elevenlabs':
        voicesList = await handleElevenLabsVoicesList(user, guestId)
        break

      default:
        throw new StatusError('Voice type not supported', 400)
    }
  } catch (ex: any) {
    throw new StatusError(ex.message, 500)
  }
  return { voices: voicesList }
}

export async function generateVoice(
  { user, chatId, messageId, voiceBackend, voiceId, ...opts }: TextToSpeechRequest,
  log: AppLog,
  guestId?: string
) {
  const broadcastIds: string[] = []

  if (!guestId) {
    broadcastIds.push(user._id)
    const members = await store.chats.getActiveMembers(chatId)
    broadcastIds.push(...members, user._id)
  }

  let audio: TextToSpeechAdapterResponse | undefined
  let output: string = ''
  let error: any
  const text = processText(opts.text, user.voice?.filterActions || true)

  log.debug({ text, voiceBackend, voiceId }, 'Text to speech')

  const generatingMessage = { chatId, messageId, type: 'voice-generating' }
  if (broadcastIds.length) {
    sendMany(broadcastIds, generatingMessage)
  } else if (guestId) {
    sendGuest(guestId, generatingMessage)
  }

  try {
    switch (voiceBackend) {
      case 'elevenlabs':
        audio = await handleElevenLabsTextToSpeech(
          { user, text, voiceBackend, voiceId },
          log,
          guestId
        )
        break
    }
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
  return text
}
