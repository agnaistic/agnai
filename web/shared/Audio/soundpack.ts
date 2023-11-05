import { PlayableEvent } from './playable-events'

type RemoteSound = { url: string }
type LocalStorageSound = { key: string }
type FileSound = { path: string }

type SoundSource = RemoteSound | LocalStorageSound | FileSound

export type Sound = {
  soundId: string
  name: string
  type: string
  source: SoundSource
}

export type EventId = keyof PlayableEvent & string
export type SoundId = string
export type SoundpackId = string

export type RandomAmbientSound = {
  soundId: SoundId
  frequencyMinSecs: number
  frequencyMaxSecs: number
}

export type InteractionSound = {
  eventId: EventId
  soundId: SoundId
}

export type Soundpack = {
  id: SoundpackId
  name: string
  author?: string
  description?: string
  backgroundAmbience?: SoundId
  randomAmbientSounds: RandomAmbientSound[]
  interactionSounds: InteractionSound[]
  sounds: Sound[]
}

export function createEmptySoundpack(): Soundpack {
  return {
    id: '',
    name: '',
    backgroundAmbience: undefined,
    randomAmbientSounds: [],
    interactionSounds: [],
    sounds: [],
  }
}

export function getSoundpack(_id: string) {
  // TODO: load soundpack
  // return an example for now
  const soundpack = createEmptySoundpack()
  soundpack.id = 'ench_king_id'
  soundpack.name = 'Enchanted Kingdom'
  soundpack.author = 'xyz'
  soundpack.description =
    'Step into a world of magic and adventure with the "Enchanted Kingdom" soundpack. Immerse yourself in the medieval atmosphere enriched by the harmonious blend of melodic background tunes, the gentle rustling of leaves in an ancient forest, and the distant chatter of a bustling marketplace.'
  soundpack.backgroundAmbience = 'atmo.mp3'
  soundpack.randomAmbientSounds.push({
    soundId: 'dragon.mp3',
    frequencyMinSecs: 90,
    frequencyMaxSecs: 360,
  })
  soundpack.randomAmbientSounds.push({
    soundId: 'chimes.mp3',
    frequencyMinSecs: 30,
    frequencyMaxSecs: 60,
  })
  soundpack.randomAmbientSounds.push({
    soundId: 'birds.mp3',
    frequencyMinSecs: 20,
    frequencyMaxSecs: 120,
  })
  soundpack.interactionSounds.push({ eventId: 'menu-item-clicked', soundId: 'click.mp3' })
  soundpack.sounds.push({
    soundId: 'atmo.mp3',
    name: 'Chatter',
    type: 'mp3',
    source: {
      url: '',
    },
  })
  soundpack.sounds.push({
    soundId: 'click.mp3',
    name: 'Click',
    type: 'mp3',
    source: { url: '' },
  })

  soundpack.sounds.push({
    soundId: 'dragon.mp3',
    name: 'Dragon roar',
    type: 'mp3',
    source: {
      url: '',
    },
  })

  soundpack.sounds.push({
    soundId: 'chimes.mp3',
    name: 'Magic chimes',
    type: 'mp3',
    source: { url: '' },
  })

  soundpack.sounds.push({
    soundId: 'birds.mp3',
    name: 'Bird song',
    type: 'mp3',
    source: { url: '' },
  })

  return soundpack
}

export function findSoundForEvent(soundpack: Soundpack, event: string) {
  if (!event) return undefined
  // TODO cache
  const intSound = soundpack.interactionSounds.find((s) => s.eventId === event)
  if (!intSound) return undefined
  return soundpack.sounds.find((s) => s.soundId === intSound.soundId)
}
