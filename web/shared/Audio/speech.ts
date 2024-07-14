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

  if (state.user?.admin) return true
  if (tts === 'subscribers' && (!state.sub?.level || state.sub?.level < 0)) return false
  if (tts === 'users' && state.user?._id === 'anon') return false
  return true
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
