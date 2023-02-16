import { AppSchema } from '../../server/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type Settings = Omit<AppSchema.Settings, 'kind'>

type SettingStore = {
  init: boolean
  settings: Settings
}

const init: SettingStore = {
  init: false,
  settings: {
    novelApiKey: '',
    koboldUrl: '',
    chaiUrl: '',
  },
}

export const settingStore = createStore<SettingStore>(
  'settings',
  init
)((get, set) => {
  const load = async () => {
    const res = await api.get('/settings')
    if (res.error) toastStore.error(`Failed to load settings`)
    return { settings: res.result }
  }
  const save = async ({ settings: prev }, settings: Partial<Settings>) => {
    const res = await api.post('/settings', settings)
    if (res.error) toastStore.error(`Failed to update settings: ${res.error}`)
    else toastStore.success('Successfully updated settings')

    return { settings: { ...prev, ...settings } }
  }

  return {
    load,
    save,
  }
})
