import { AudioSource } from './AudioSource'
import { NativeSpeechOpts, isSupported, getVoices } from './native-speech'
import { RemoteAudioOpts } from './remote-speech'

let currentAudio: AudioSource | undefined = undefined

let isSpeechSupported: boolean | undefined

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
