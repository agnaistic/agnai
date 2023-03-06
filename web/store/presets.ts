import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type PresetStore = {
  presets: AppSchema.UserGenPreset[]
}

export const presetStore = createStore<PresetStore>('presets', { presets: [] })((_) => ({
  async getPresets() {
    const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
    if (res.error) toastStore.error('Failed to retrieve presets')
    if (res.result) {
      return { presets: res.result.presets }
    }
  },
}))
