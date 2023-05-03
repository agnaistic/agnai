import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { PresetUpdate, presetApi } from './data/presets'
import { toastStore } from './toasts'

type PresetState = {
  presets: AppSchema.UserGenPreset[]
  saving: boolean
}

const initState: PresetState = { presets: [], saving: false }

export const presetStore = createStore<PresetState>(
  'presets',
  initState
)((_) => {
  events.on(EVENTS.init, (init) => {
    presetStore.setState({ presets: init.presets })
  })

  events.on(EVENTS.loggedOut, () => {
    presetStore.setState(initState)
  })

  return {
    async getPresets() {
      const res = await presetApi.getPresets()
      if (res.error) toastStore.error('Failed to retrieve presets')
      if (res.result) {
        return { presets: res.result.presets }
      }
    },
    async *updatePreset(
      { presets },
      presetId: string,
      preset: Partial<PresetUpdate>,
      onSuccess?: () => void
    ) {
      yield { saving: true }
      const res = await presetApi.editPreset(presetId, preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to update preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully updated preset')
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
      const res = await presetApi.createPreset(preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to create preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully created preset')
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
      const res = await presetApi.deletePreset(presetId)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to delete preset: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully deleted preset')

        const next = presets.filter((pre) => pre._id !== presetId)
        yield { presets: next }
        onSuccess?.(res.result)
      }
    },
  }
})
