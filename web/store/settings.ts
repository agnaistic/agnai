import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { setAssetPrefix } from '../shared/util'
import { api } from './api'
import { createStore } from './create'
import { usersApi } from './data/user'
import { toastStore } from './toasts'

type SettingState = {
  initLoading: boolean
  showMenu: boolean
  fullscreen: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
  workers: HordeWorker[]
  imageWorkers: HordeWorker[]
  anonymize: boolean

  init?: {
    profile: AppSchema.Profile
    user: AppSchema.User
    presets: AppSchema.UserGenPreset[]
    config: AppSchema.AppConfig
    books: AppSchema.MemoryBook[]
  }
}

const HORDE_URL = `https://stablehorde.net/api/v2`

const initState: SettingState = {
  anonymize: false,
  initLoading: true,
  showMenu: false,
  fullscreen: false,
  models: [],
  workers: [],
  imageWorkers: [],
  config: {
    adapters: [],
    canAuth: true,
    version: '...',
    assetPrefix: '',
    selfhosting: false,
    imagesSaved: false,
  },
}

export const settingStore = createStore<SettingState>(
  'settings',
  initState
)((_) => {
  events.on(EVENTS.loggedOut, () => {
    settingStore.setState(initState)
    settingStore.init()
  })

  return {
    async *init() {
      yield { initLoading: true }
      const res = await usersApi.getInit()
      yield { initLoading: false }

      if (res.result) {
        setAssetPrefix(res.result.config.assetPrefix)
        events.emit(EVENTS.init, res.result)
        yield { init: res.result, config: res.result.config }
      }

      if (res.error) {
        setTimeout(() => settingStore.init(), 2500)
      }
    },
    menu({ showMenu }) {
      return { showMenu: !showMenu }
    },
    closeMenu: () => {
      return { showMenu: false }
    },
    fullscreen(_, next: boolean) {
      return { fullscreen: next }
    },
    async getConfig() {
      const res = await api.get('/settings')
      if (res.result) {
        return { config: res.result }
      }
    },
    async getHordeModels() {
      const res = await api.get<{ models: HordeModel[] }>('/horde/models')
      if (res.result) {
        return { models: res.result.models }
      }
    },
    async getHordeWorkers() {
      try {
        const res = await fetch(`${HORDE_URL}/workers?type=text`)
        const json = await res.json()

        return { workers: json }
      } catch (ex) {
        toastStore.error(`Could not retrieve Horde workers`)
        console.error(ex)
      }
    },

    async getHordeImageWorkers() {
      try {
        const res = await fetch(`${HORDE_URL}/workers?type=image`)
        const json = await res.json()

        return { imageWorkers: json }
      } catch (ex) {
        toastStore.error(`Could not retrieve Horde workers`)
        console.error(ex)
      }
    },

    toggleAnonymize({ anonymize }) {
      return { anonymize: !anonymize }
    },
  }
})
