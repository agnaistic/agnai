import { Sound } from './soundpack'

let audioContext = new AudioContext()
let audioBuffers = new Map<string, AudioBuffer>()
let sfxSoundSource = audioContext.createBufferSource()

export async function loadSounds(sounds: IterableIterator<Sound>) {
  for (let sound of sounds) {
    let soundArrayBuffer: AudioBuffer | undefined

    if ('url' in sound.source) {
      soundArrayBuffer = await loadRemoteSound(sound.source.url)
    } else if ('path' in sound.source) {
      // TODO load from file?
    } else if ('key' in sound.source) {
      // TODO load from storage
    }

    if (soundArrayBuffer) {
      audioBuffers.set(sound.soundId, soundArrayBuffer)
    }
  }
}

async function loadRemoteSound(url: string) {
  const response = await window.fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return createBuffer(arrayBuffer)
}

async function createBuffer(arrayBuffer: ArrayBuffer) {
  const bufferPromise = async () => {
    return new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (err) => reject(err)
      )
    })
  }
  return await bufferPromise()
}

export function playSoundEffect(sound?: Sound) {
  if (!sound || !sound.soundId) return
  const buffer = audioBuffers.get(sound.soundId)
  if (!buffer) return
  sfxSoundSource.disconnect()
  sfxSoundSource = audioContext.createBufferSource()
  sfxSoundSource.buffer = buffer
  sfxSoundSource.connect(audioContext.destination)
  sfxSoundSource.start()
}
