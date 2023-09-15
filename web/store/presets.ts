import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { api } from './api'
import { createStore } from './create'
import { PresetCreate, PresetUpdate, SubscriptionUpdate, presetApi } from './data/presets'
import { toastStore } from './toasts'

type PresetState = {
  presets: AppSchema.UserGenPreset[]
  templates: AppSchema.PromptTemplate[]
  subs: AppSchema.SubscriptionPreset[]
  saving: boolean
}

const initState: PresetState = {
  presets: [],
  templates: [],
  subs: [],
  saving: false,
}

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
      preset: PresetCreate,
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
    async getSubscriptions() {
      const res = await api.get('/admin/subscriptions')
      if (res.error) toastStore.error(`Failed to retrieve subscriptions`)
      if (res.result) {
        return { subs: res.result.subscriptions }
      }
    },
    async *createSubscription(
      { subs },
      sub: SubscriptionUpdate,
      onSuccess?: (sub: AppSchema.SubscriptionPreset) => void
    ) {
      const res = await api.post('/admin/subscriptions', sub)
      if (res.error) toastStore.error(`Failed to create subscription: ${res.error}`)
      if (res.result) {
        yield { subs: subs.concat(res.result) }
        onSuccess?.(res.result)
      }
    },
    async *updateSubscription({ subs }, id: string, update: SubscriptionUpdate) {
      const res = await api.post(`/admin/subscriptions/${id}`, update)
      if (res.error) toastStore.error(`Failed to update subscription: ${res.error}`)
      if (res.result) {
        toastStore.success(`Subscription updated`)
        return { subs: subs.filter((sub) => (sub._id === id ? { ...sub, ...update } : sub)) }
      }
    },
    async *deleteSubscription(
      { subs },
      subscriptionId: string,
      onSuccess?: (preset: AppSchema.UserGenPreset) => void
    ) {
      const res = await api.method('delete', `/admin/subscriptions/${subscriptionId}`)
      if (res.error) toastStore.error(`Failed to delete subscription: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully deleted subscription')

        const next = subs.filter((sub) => sub._id !== subscriptionId)
        yield { subs: next }
        onSuccess?.(res.result)
      }
    },
    async getTemplates() {
      const res = await presetApi.getTemplates()
      if (res.result) {
        return { templates: res.result.templates }
      }

      if (res.error) {
        toastStore.error(`Could not retrieve templates: ${res.error}`)
      }
    },
    async *createTemplate({ templates }, name: string, template: string, done?: () => void) {
      const res = await presetApi.createTemplate({ name, template })
      if (res.result) {
        yield { templates: templates.concat(res.result) }
        done?.()
        return
      }

      if (res.error) {
        toastStore.error(`Failed to create template: ${res.error}`)
      }
    },

    async *updateTemplate(
      { templates },
      id: string,
      update: { name: string; template: string },
      done?: () => void
    ) {
      const res = await presetApi.updateTemplate(id, update)
      if (res.result) {
        const next = templates.map((t) => (t._id === id ? { ...t, ...update } : t))
        yield { templates: next }
        done?.()
        return
      }

      if (res.error) {
        toastStore.error(`Failed to update template: ${res.error}`)
      }
    },

    async *deleteTemplate({ templates }, id: string) {
      const res = await presetApi.deleteTemplate(id)
      if (res.result) {
        return { templates: templates.filter((t) => t._id !== id) }
      }

      if (res.error) {
        toastStore.error(`Failed to delete template: ${res.error}`)
      }
    },
  }
})
