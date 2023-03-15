import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'

type SettingStore = {
  showMenu: boolean
  fullscreen: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
  workers: HordeWorker[]
}

const HORDE_URL = `https://stablehorde.net/api/v2`

export const settingStore = createStore<SettingStore>('settings', {
  showMenu: false,
  fullscreen: false,
  models: [],
  workers: [],
  config: { adapters: [], canAuth: true, version: '...' },
})((_) => ({
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
}))
