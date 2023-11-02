import { soundEmitter } from '../shared/Audio/playable-events'
import { loadSounds, playSoundEffect } from '../shared/Audio/player'
import { Soundpack, findSoundForEvent, getAllSounds, getSoundpack } from '../shared/Audio/soundpack'
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

export type AudioState = {
  soundsLoaded: boolean
  tracks: AudioTracks
  soundpacks: {
    global: Soundpack | undefined
    scenario: Soundpack | undefined
    chat: Soundpack | undefined
    character: Soundpack | undefined
  }
  currentSoundpack: Soundpack | undefined
}

const initAudioStore: AudioState = {
  soundsLoaded: false,
  tracks: {
    master: { muted: true, volume: 100 },
    background: { muted: false, volume: 100 },
    randomAmbient: { muted: false, volume: 100 },
    interaction: { muted: false, volume: 100 },
    speech: { muted: false, volume: 100 },
  },
  soundpacks: {
    global: undefined,
    scenario: undefined,
    chat: undefined,
    character: undefined,
  },
  currentSoundpack: undefined,
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
      const sounds = getAllSounds(soundpack)
      await loadSounds(sounds)
      return {
        soundsLoaded: true,
        currentSoundpack: soundpack,
      }
    },

    handlePlayableEvent(state, event, _args) {
      if (!state.soundsLoaded || !state.currentSoundpack) return

      const sound = findSoundForEvent(state.currentSoundpack, event)

      playSoundEffect(sound)
    },

    toggleMuteTrack({ tracks }, trackId: AudioTrackId): Partial<AudioState> {
      return {
        tracks: { ...tracks, [trackId]: { ...tracks[trackId], muted: !tracks[trackId].muted } },
      }
    },

    setTrackVolume({ tracks }, trackId: AudioTrackId, volume: number) {
      if (volume < 0 || volume > 100) throw new Error(`volume parameter out of range ${volume}`)
      return { tracks: { ...tracks, [trackId]: { ...tracks[trackId], volume } } }
    },
  }
})
//audioStore.init()
