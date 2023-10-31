import { soundEmitter } from '../shared/Audio/playable-events'
import { loadSounds, playSoundEffect } from '../shared/Audio/player'
import { Soundpack, findSoundForEvent, getAllSounds, getSoundpack } from '../shared/Audio/soundpack'
import { createStore } from './create'

export type AudioTrackState = {
  mute: boolean
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
    master: { mute: true, volume: 100 },
    background: { mute: false, volume: 100 },
    randomAmbient: { mute: false, volume: 100 },
    interaction: { mute: false, volume: 100 },
    speech: { mute: false, volume: 100 },
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
      const updated = { ...tracks }
      updated[trackId].mute = !tracks[trackId]
      return { tracks: updated }
    },

    setTrackVolume({ tracks }, trackId: AudioTrackId, volume: number) {
      if (volume < 0 || volume > 100) throw new Error(`volume parameter out of range ${volume}`)

      const updated = { ...tracks }
      updated[trackId].volume = volume
      return { tracks: updated }
    },
  }
})
//audioStore.init()
