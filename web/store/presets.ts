import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { data } from './data'
import { PresetUpdate } from './data/presets'
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

        const next = presets.filter((pre) => pre._id !== presetId)
        yield { presets: next }
        onSuccess?.(res.result)
      }
    },
  }
})
