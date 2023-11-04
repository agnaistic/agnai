import { soundEmitter } from '../shared/Audio/playable-events'
import { Soundpack, SoundpackId, getSoundpack } from '../shared/Audio/soundpack'
import { createStore } from './create'

export type AudioTrackState = {
  muted: boolean
  volume: number
}

export type AudioTracks = {
  master: AudioTrackState
  background: AudioTrackState
  randomAmbient: AudioTrackState
  interaction: AudioTrackState
  speech: AudioTrackState
}

export type AudioTrackId = keyof AudioTracks

export type SoundpackSelection = {
  global?: SoundpackId
  scenario?: SoundpackId
  chat?: SoundpackId
  character?: SoundpackId
}

export type SoundpackLevel = keyof SoundpackSelection

export type AudioState = {
  tracks: AudioTracks
  selectedSoundpacks: SoundpackSelection
  soundpacks: Soundpack[]
}

const initAudioStore: AudioState = {
  tracks: {
    master: { muted: true, volume: 100 },
    background: { muted: false, volume: 100 },
    randomAmbient: { muted: false, volume: 100 },
    interaction: { muted: false, volume: 100 },
    speech: { muted: false, volume: 100 },
  },
  selectedSoundpacks: {},
  soundpacks: [],
}

export const audioStore = createStore<AudioState>(
  'audio',
  initAudioStore
)(() => {
  // TODO setup app event handlers

  soundEmitter.setGlobalEventListener((event, args) => {
    // disabled for now
    // audioStore.handlePlayableEvent(event, args)
    // console.debug('Audio Event: ', event, args)
  })

  return {
    async init(state) {
      // TODO: load soundpacks from state, calculate the resulting soundpack
      // for now just load the example
      const soundpack = getSoundpack('')
      //const sounds = getAllSounds(soundpack)
      //await loadSounds(sounds)

      return {
        soundsLoaded: true,
        soundpacks: [soundpack],
      }
    },

    handlePlayableEvent(state, event, _args) {},

    toggleMuteTrack({ tracks }, trackId: AudioTrackId): Partial<AudioState> {
      return {
        tracks: { ...tracks, [trackId]: { ...tracks[trackId], muted: !tracks[trackId].muted } },
      }
    },

    setTrackVolume({ tracks }, trackId: AudioTrackId, volume: number): Partial<AudioState> {
      if (volume < 0 || volume > 100) throw new Error(`volume parameter out of range ${volume}`)
      return { tracks: { ...tracks, [trackId]: { ...tracks[trackId], volume } } }
    },

    selectSoundpack({ selectedSoundpacks }, level: SoundpackLevel, id: SoundpackId | undefined) {
      return { selectedSoundpacks: { ...selectedSoundpacks, [level]: id } }
    },
  }
})
audioStore.init()
