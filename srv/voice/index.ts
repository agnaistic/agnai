import { TextToSpeechAdapterResponse, TextToSpeechRequest } from './types'
import { AppLog } from '../logger'
import { handleElevenLabsTextToSpeech } from './elevenlabs'
import { store } from '../db'
import { config } from '../config'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { sendGuest, sendMany } from '../api/ws'
import { errors } from '../api/wrap'
import { StatusError } from '../api/wrap'

export async function generateVoice(
  { user, chatId, messageId, ...opts }: TextToSpeechRequest,
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
  const text = opts.text.trim()

  log.debug({ text, type: user.voice?.type }, 'Text to speech')

  const generatingMessage = { chatId, messageId, type: 'voice-generating' }
  if (broadcastIds.length) {
    sendMany(broadcastIds, generatingMessage)
  } else if (guestId) {
    sendGuest(guestId, generatingMessage)
  }

  try {
    switch (user.voice?.type) {
      case 'elevenlabs':
        audio = await handleElevenLabsTextToSpeech({ user, text }, log, guestId)
        break
    }
  } catch (ex: any) {
    error = ex.message || ex
  }

  if (!audio) {
    error = error || 'Invalid text to speech settings (No handler found)'
    send(broadcastIds, guestId, {
      type: 'voice-failed',
      chatId,
      messageId,
      error,
    })
    throw new StatusError(`Failed to generate speech: ${error}`, 500)
  }

  output = await saveFile(`temp-${v4()}.${audio.ext}`, audio.content, 300)

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
