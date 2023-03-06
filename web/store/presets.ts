import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type PresetStore = {
  presets: AppSchema.UserGenPreset[]
  saving: boolean
}

type PresetUpdate = Omit<AppSchema.UserGenPreset, '_id' | 'kind' | 'userId'>

export const presetStore = createStore<PresetStore>('presets', { presets: [], saving: false })(
  (_) => ({
    async getPresets() {
      const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
      if (res.error) toastStore.error('Failed to retrieve presets')
      if (res.result) {
        return { presets: res.result.presets }
      }
    },
    async *updatePreset(
      { presets },
      presetId: string,
      preset: PresetUpdate,
      onSuccess?: () => void
    ) {
      yield { saving: true }
      const res = await api.post<AppSchema.UserGenPreset>(`/user/presets/${presetId}`, preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to update preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully updated preset!')
        yield { presets: presets.map((p) => (p._id === presetId ? res.result! : p)) }
        onSuccess?.()
      }
    },
    async *createPreset(
      { presets },
      preset: PresetUpdate,
      onSuccess?: (preset: AppSchema.UserGenPreset) => void
    ) {
      yield { saving: true }
      const res = await api.post<AppSchema.UserGenPreset>('/user/presets', preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to create preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully created preset!')
        yield { presets: presets.concat(res.result) }
        onSuccess?.(res.result)
      }
    },
  })
)
