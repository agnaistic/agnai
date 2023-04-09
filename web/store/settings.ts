import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { setAssetPrefix } from '../shared/util'
import { api } from './api'
import { createStore } from './create'
import { data } from './data'

type SettingStore = {
  initLoading: boolean
  showMenu: boolean
  fullscreen: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
  workers: HordeWorker[]
  init?: {
    profile: AppSchema.Profile
    user: AppSchema.User
    presets: AppSchema.UserGenPreset[]
    config: AppSchema.AppConfig
    books: AppSchema.MemoryBook[]
  }
}

const HORDE_URL = `https://stablehorde.net/api/v2`

export const settingStore = createStore<SettingStore>('settings', {
  initLoading: true,
  showMenu: false,
  fullscreen: false,
  models: [],
  workers: [],
  config: { adapters: [], canAuth: true, version: '...', assetPrefix: '', selfhosting: false },
})((_) => ({
  async *init() {
    yield { initLoading: true }
    const res = await data.user.getInit()
    yield { initLoading: false }

    if (res.result) {
      setAssetPrefix(res.result.config.assetPrefix)
      return { init: res.result, config: res.result.config }
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
    const res = await fetch(`${HORDE_URL}/workers?type=text`)
    const json = await res.json()

    return { workers: json }
  },

  async *guestMigrate() {},
}))
