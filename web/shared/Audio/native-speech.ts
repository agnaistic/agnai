import EasySpeech from '/web/pkg/easy-speech.js'
import { AppSchema, VoiceWebSynthesisSettings } from '/common/types'
import { toastStore } from '/web/store'

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

  async play(_rate?: number) {
    await EasySpeech.speak({
      ...this.params,
      start: () => {
        this.onplaying()
      },
      end: this.onended,
      error: (e: SpeechSynthesisErrorEvent) => {
        if (e.error === 'interrupted') return
        if (e.error === 'canceled') return
        this.onerror(e.error)
      },
    })
  }

  async stop() {
    EasySpeech.cancel()
  }
}

export function isSupported() {
  const feats = EasySpeech.detect()
  return feats.speechSynthesis !== undefined && feats.speechSynthesisUtterance !== undefined
}

export async function getVoices(): Promise<AppSchema.VoiceDefinition[]> {
  return EasySpeech.voices().map(convertToOptions)
}

export function createNativeSpeech(
  opts: NativeSpeechOpts,
  onplaying: () => void,
  onended: () => void,
  onerror: (message: string) => void
): NativeSpeech {
  const params = {
    text: opts.filterAction ? filterAction(opts.text) : opts.text,
    lang: opts.culture,
    voice: getVoice(opts.voice.voiceId),
    pitch: opts.voice.pitch || 1,
    rate: opts.voice.rate || 1,
    volume: 1,
  }

  return new NativeSpeech(params, onplaying, onended, onerror)
}

async function ensureSpeechInitialized() {
  await EasySpeech.init({ maxTimeout: 5000, interval: 250 })
}

function getVoice(voiceId: string) {
  const voices = EasySpeech.voices()

  let syntheticVoice = voices.find((v) => v.voiceURI === voiceId) ?? null
  if (!syntheticVoice) {
    const fallback = voices.find((v) => v.name.includes('United States'))

    if (!voices.length) {
      throw new Error(`Voice "${voiceId}" not available: No voices available on this device`)
    }

    if (!fallback) {
      throw new Error(`Voice "${voiceId}" not available: Update your character's voice settings.`)
    }

    toastStore.warn(
      `Voice "${voiceId}" not available: Using fallback. Update your character to fix this warning.`
    )
    syntheticVoice = fallback
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

ensureSpeechInitialized()
