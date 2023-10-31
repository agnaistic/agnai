type RemoteSound = { url: string }
type LocalStorageSound = { key: string }
type FileSound = { path: string }

type SoundSource = RemoteSound | LocalStorageSound | FileSound

export type Sound = {
  soundId: string
  type: string
  source: SoundSource
}

type EventId = string
type SoundId = string

export type RandomAmbientSounds = {}

export type Soundpack = {
  backgroundAmbience?: SoundId
  randomAmbientSounds: RandomAmbientSounds
  interactionSounds: Map<EventId, SoundId>
  sounds: Map<SoundId, Sound>
}

export function createEmptySoundpack(): Soundpack {
  return {
    backgroundAmbience: undefined,
    randomAmbientSounds: [],
    interactionSounds: new Map<EventId, SoundId>(),
    sounds: new Map<SoundId, Sound>(),
  }
}

export function getSoundpack(_id: string) {
  // TODO: load soundpack
  // return an example for now
  const soundpack = createEmptySoundpack()
  soundpack.interactionSounds.set('menu-item-clicked', 'click.wav')
  soundpack.sounds.set('click.wav', {
    soundId: 'click.wav',
    type: 'mp3',
    source: { url: 'https://assets.mixkit.co/active_storage/sfx/1133/1133-preview.mp3' },
  })

  return soundpack
}

export function getAllSounds(soundpack: Soundpack) {
  return soundpack.sounds.values()
}

export function findSoundForEvent(soundpack: Soundpack, event: string): Sound | undefined {
  if (!event) return undefined
  const soundId = soundpack.interactionSounds.get(event)
  if (!soundId) return undefined
  return soundpack.sounds.get(soundId)
}
