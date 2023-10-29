import { soundEmitter } from '../shared/Audio/playable-events'
import { loadSounds, playSoundEffect } from '../shared/Audio/player'
import { Soundpack, findSoundForEvent, getAllSounds, getSoundpack } from '../shared/Audio/soundpack'
import { createStore } from './create'

export type ChannelState = {
  mute: boolean
  volume: number
}

export type AudioState = {
  soundsLoaded: boolean
  global: ChannelState
  channels: {
    ambient: ChannelState
    sfx: ChannelState
  }
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
  global: { mute: true, volume: 1 },
  channels: {
    ambient: { mute: false, volume: 1 },
    sfx: { mute: false, volume: 1 },
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
    toggleMuteAll(state) {
      return {
        global: {
          ...state.global,
          mute: !state.global.mute,
        },
      }
    },
  }
})
//audioStore.init()
