import { AudioReference } from './AudioReference'
import { speechSynthesisManager } from './SpeechSynthesisManager'
import { VoiceWebSynthesisSettings } from '/srv/db/texttospeech-schema'

let currentAudio: AudioReference | undefined = undefined

type SpeechOpts =
  | { url: string }
  | { voice: VoiceWebSynthesisSettings; text: string; culture: string; filterAction: boolean }

export async function createSpeech(opts: SpeechOpts) {
  if ('url' in opts) {
    currentAudio?.pause()
    currentAudio = new AudioReference({ audio: new Audio(opts.url) })
    return currentAudio
  }

  const speech = await speechSynthesisManager.createSpeechSynthesis(
    opts.voice,
    opts.text,
    opts.culture,
    opts.filterAction
  )

  currentAudio = new AudioReference({ speech })
  return currentAudio
}

export function pauseSpeech() {
  currentAudio?.pause()
}
