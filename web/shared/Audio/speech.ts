import { AudioSource } from './audio-source'
import { NativeSpeechOpts, isSupported, getVoices } from './native-speech'
import { RemoteAudioOpts } from './remote-speech'
import { settingStore, userStore } from '/web/store'

let currentAudio: AudioSource | undefined = undefined

let isSpeechSupported: boolean | undefined

export function isAgnaisticSpeechAllowed() {
  const state = userStore.getState()
  const settings = settingStore.getState()
  const tts = settings.config.serverConfig?.ttsAccess

  if (!tts || tts === 'off') return false

  switch (tts) {
    case 'admins':
      return !!state.user?.admin

    case 'subscribers':
      return state.sub?.level && state.sub.level > 0

    case 'users':
      return state.user?._id !== 'anon'
  }

  return false
}

export function isNativeSpeechSupported() {
  if (isSpeechSupported === undefined) {
    isSpeechSupported = isSupported()
  }
  return isSpeechSupported
}

export async function getNativeVoices() {
  return getVoices()
}

export async function createSpeech(opts: RemoteAudioOpts | NativeSpeechOpts) {
  currentAudio?.stop()
  currentAudio = await AudioSource.create(opts)
  return currentAudio
}

export function stopSpeech() {
  currentAudio?.stop()
  currentAudio = undefined
}
