import { getAssetUrl } from '../util'
import { AudioReference } from './AudioReference'
import { AppSchema } from '/common/types'
import { VoiceWebSynthesisSettings } from '/common/types'

let currentAudio: AudioReference | undefined = undefined
let voicesReady = false

if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => {
    voicesReady = true
  }
} else {
  voicesReady = true
}

type SpeechOpts =
  | { url: string }
  | { voice: VoiceWebSynthesisSettings; text: string; culture: string; filterAction: boolean }

export async function createSpeech(opts: SpeechOpts) {
  if ('url' in opts) {
    currentAudio?.pause()
    currentAudio = new AudioReference({ audio: new Audio(getAssetUrl(opts.url)) })
    return currentAudio
  }

  speechSynthesis.cancel()
  const speech = await createNativeSpeech(opts.voice, opts.text, opts.culture, opts.filterAction)

  currentAudio = new AudioReference({ speech })
  return currentAudio
}

export function pauseSpeech() {
  currentAudio?.pause()
}

export async function getNativeVoices(started = Date.now()): Promise<AppSchema.VoiceDefinition[]> {
  if (voicesReady) {
    return speechSynthesis.getVoices().map(convertToOptions)
  }

  const diff = Date.now() - started
  if (diff > 3000) {
    throw new Error('Failed to load voices: Timeout')
  }

  if (!voicesReady) {
    await new Promise((res) => setTimeout(res, 25))
  }

  return getNativeVoices(started)
}

export async function createNativeSpeech(
  voice: VoiceWebSynthesisSettings,
  text: string,
  culture: string,
  filterAction: boolean
) {
  await getNativeVoices()
  const voices = speechSynthesis.getVoices()
  const syntheticVoice = voices.find((v) => v.voiceURI === voice.voiceId) ?? null
  if (!syntheticVoice) {
    new Error(`Voice ${voice.voiceId} not found in web speech synthesis`)
  }
  const speech = new SpeechSynthesisUtterance()
  if (filterAction) {
    const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
    text = text.replace(filterActionsRegex, '   ')
  }

  speech.text = text
  speech.voice = syntheticVoice
  speech.lang = culture
  speech.pitch = voice.pitch || 1
  speech.rate = voice.rate || 1
  return speech
}

function convertToOptions(voice: SpeechSynthesisVoice) {
  return {
    id: voice.voiceURI,
    label: voice.name,
    previewUrl: voice.voiceURI,
  }
}
