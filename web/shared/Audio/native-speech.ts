import EasySpeech from 'easy-speech'
import { AppSchema, VoiceWebSynthesisSettings } from '/common/types'

export type NativeSpeechOpts = {
  kind: 'native'
  voice: VoiceWebSynthesisSettings
  text: string
  culture: string
  filterAction: boolean
}

export type NativeSpeechParams = {
  text: string
  lang: string
  voice: SpeechSynthesisVoice
  pitch: number
  rate: number
  volume: number
}

export class NativeSpeech {
  constructor(
    public params: NativeSpeechParams,
    public onplaying: () => void,
    public onended: () => void,
    public onerror: (message: string) => void
  ) {}

  play() {
    ensureSpeechInitialized()
    EasySpeech.speak({
      ...this.params,
      start: this.onplaying,
      end: this.onended,
      error: (e: SpeechSynthesisErrorEvent) => {
        if (e.error === 'interrupted') return
        if (e.error === 'canceled') return
        this.onerror(e.error)
      },
    })
  }
  stop() {
    ensureSpeechInitialized()
    EasySpeech.cancel()
  }
}

export function isSupported() {
  const feats = EasySpeech.detect()
  return feats.speechSynthesis !== undefined && feats.speechSynthesisUtterance !== undefined
}

export async function getVoices(): Promise<AppSchema.VoiceDefinition[]> {
  await ensureSpeechInitialized()
  return EasySpeech.voices().map(convertToOptions)
}

export async function createNativeSpeech(
  opts: NativeSpeechOpts,
  onplaying: () => void,
  onended: () => void,
  onerror: (message: string) => void
): Promise<NativeSpeech> {
  const params = {
    text: opts.filterAction ? filterAction(opts.text) : opts.text,
    lang: opts.culture,
    voice: await getVoice(opts.voice.voiceId),
    pitch: opts.voice.pitch || 1,
    rate: opts.voice.rate || 1,
    volume: 1,
  }

  return new NativeSpeech(params, onplaying, onended, onerror)
}

async function ensureSpeechInitialized() {
  await EasySpeech.init({ maxTimeout: 5000, interval: 250 })
}

async function getVoice(voiceId: string) {
  await ensureSpeechInitialized()
  const voices = EasySpeech.voices()
  const syntheticVoice = voices.find((v) => v.voiceURI === voiceId) ?? null
  if (!syntheticVoice) {
    throw new Error(`Voice ${voiceId} not found in web speech synthesis`)
  }
  return syntheticVoice
}

function filterAction(text: string): string {
  const filterActionsRegex = /\*[^*]*\*|\([^)]*\)/g
  return text.replace(filterActionsRegex, '   ')
}

function convertToOptions(voice: SpeechSynthesisVoice) {
  return {
    id: voice.voiceURI,
    label: voice.name,
    previewUrl: voice.voiceURI,
  }
}
