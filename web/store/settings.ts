import { HordeModel } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'

type SettingStore = {
  showMenu: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
}

export const settingStore = createStore<SettingStore>('settings', {
  showMenu: false,
  models: [],
  config: { adapters: [], canAuth: true },
})((_) => ({
  menu({ showMenu }) {
    return { showMenu: !showMenu }
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
}))
