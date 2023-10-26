import { soundEmitter } from '../shared/Audio/playable-events'
import { createStore } from './create'

export type ChannelState = {
  mute: boolean
  volume: number
}

export type AudioState = {
  channels: {
    all: ChannelState
    ambient: ChannelState
    sfx: ChannelState
  }
  soundpacks: {
    global: any
    scenario: any
    chat: any
    character: any
  }
}

const initAudioStore = {
  channels: {
    all: { mute: false, volume: 1 },
    ambient: { mute: false, volume: 1 },
    sfx: { mute: false, volume: 1 },
  },
  soundpacks: {
    global: null,
    scenario: null,
    chat: null,
    character: null,
  },
}

export const audioStore = createStore<AudioState>(
  'audio',
  initAudioStore
)(() => {
  //loadSounds()

  soundEmitter.setGlobalEventListener((event, args) => {
    audioStore.handlePlayableEvent(event, args)
  })

  return {
    toggleMuteAll(state) {
      state.channels.all.mute = !state.channels.all.mute
      state
    },
    handlePlayableEvent(state, event, args) {
      //playClick()
    },
  }
})
