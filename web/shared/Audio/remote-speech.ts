import { getAssetUrl } from '../util'

export type RemoteAudioOpts = {
  kind: 'remote'
  url: string
}

export class RemoteAudio {
  constructor(public audio: HTMLAudioElement) {}

  play() {
    this.audio.play()
  }
  stop() {
    // HTML audio element can only pause
    this.audio.pause()
  }
}

export async function createRemoteAudio(
  opts: RemoteAudioOpts,
  onplaying: () => void,
  onended: () => void,
  onerror: (message: string) => void
): Promise<RemoteAudio> {
  const audio = new Audio(getAssetUrl(opts.url))

  audio.addEventListener('playing', (_ev) => onplaying())
  audio.addEventListener('ended', (_ev) => onended())
  audio.addEventListener('error', (e) => onerror(getErrorMessage(audio, e)))

  return new RemoteAudio(audio)
}

function getErrorMessage(audio: HTMLAudioElement, e: ErrorEvent) {
  return (
    e.error ?? audio.error?.message ?? `Unknown error (code: ${audio.error?.code ?? 'unknown'})})`
  )
}
