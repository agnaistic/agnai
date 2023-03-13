import { AppSchema } from '../../srv/db/schema'
import { emptyPreset } from '../pages/GenerationPresets'
import { createStore } from './create'
import { data } from './data'
import { PresetUpdate } from './data/presets'
import { toastStore } from './toasts'

type PresetStore = {
  presets: AppSchema.UserGenPreset[]
  saving: boolean
}

export const presetStore = createStore<PresetStore>('presets', { presets: [], saving: false })(
  (_) => ({
    async getPresets() {
      const res = await data.presets.getPresets()
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
      const res = await data.presets.editPreset(presetId, preset)
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
      const res = await data.presets.createPreset(preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to create preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully created preset!')
        yield { presets: presets.concat(res.result) }
        onSuccess?.(res.result)
      }
    },
    async *deletePreset(
      { presets },
      presetId: string,
      onSuccess?: (preset: AppSchema.UserGenPreset) => void
    ) {
      yield { saving: true }
      const res = await data.presets.deletePreset(presetId)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to delete preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully deleted preset!')
        let preset: AppSchema.UserGenPreset = { _id: '', ...emptyPreset, kind: 'gen-setting', userId: '' }
        for (let i = 0; i < presets.length; i++) {
          const element = presets[i];
          if(element._id === presetId) {
            preset = element
          }
        }
        yield { presets: presets.splice(presets.indexOf(preset,1)) }
        onSuccess?.(res.result)
      }
    },
  })
)
