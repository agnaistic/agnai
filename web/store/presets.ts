import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { downloadJson } from '../shared/util'
import { api } from './api'
import { createStore } from './create'
import { PresetCreate, PresetUpdate, SubscriptionUpdate, presetApi } from './data/presets'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { AIAdapter } from '/common/adapters'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { replace } from '/common/util'

type PresetState = {
  importing?: AppSchema.UserGenPreset
  presets: AppSchema.UserGenPreset[]
  templates: AppSchema.PromptTemplate[]
  subs: AppSchema.SubscriptionModel[]
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
    setImportPreset(_, preset?: AppSchema.UserGenPreset) {
      return { importing: preset }
    },
    async *updatePreset(
      { presets },
      presetId: string,
      preset: Partial<PresetUpdate>,
      opts?: { onSuccess?: () => void; quiet?: boolean }
    ) {
      yield { saving: true }
      const res = await presetApi.editPreset(presetId, preset)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to update preset: ${res.error}`)
      if (res.result) {
        if (!opts?.quiet) toastStore.success('Successfully updated preset')
        yield { presets: presets.map((p) => (p._id === presetId ? res.result! : p)) }
        opts?.onSuccess?.()
      }
    },
    async *deleteUserPresetKey({ presets }, presetId: string, onSuccess?: () => void) {
      yield { saving: true }
      const res = await presetApi.deleteUserPresetKey(presetId)
      yield { saving: false }
      if (res.error) toastStore.error(`Failed to remove preset key: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully removed key')
        yield { presets: presets.map((p) => (p._id === presetId ? res.result! : p)) }
        onSuccess?.()
      }
    },
    async *updateRegisterPresetProp(
      { presets },
      presetId: string,
      service: AIAdapter,
      key: string,
      value: any
    ) {
      const preset: Partial<AppSchema.UserGenPreset> | undefined = isDefaultPreset(presetId)
        ? defaultPresets[presetId]
        : presets.find((p) => p._id === presetId)
      if (!preset) {
        toastStore.error(`Could not update preset: Preset not found`)
        return
      }

      const next = { ...preset?.registered }
      if (!next[service]) {
        next[service] = {}
      }

      next[service]![key] = value

      if (!isDefaultPreset(presetId)) {
        presetStore.updatePreset(presetId, { registered: next })
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
      onSuccess?: (sub: AppSchema.SubscriptionModel) => void
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
    async replaceSubscription(
      { subs },
      subId: string,
      replacementId: string,
      onSuccess?: () => void
    ) {
      const res = await api.post(`/admin/subscriptions/${subId}/replace`, { replacementId })
      if (res.result) {
        toastStore.success('Subscription successfully replaced')
        onSuccess?.()
      }

      if (res.error) {
        toastStore.error(`Subscription could not be replaced: ${res.error}`)
        return {
          subs: subs.map((sub) => (sub._id === subId ? { ...sub, subDisabled: true } : sub)),
        }
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
    async *createTemplate(
      { templates },
      name: string,
      template: string,
      presetId: string | undefined,
      done?: (templateId: string) => void
    ) {
      const res = await presetApi.createTemplate({ name, template, presetId })
      if (res.result) {
        yield { templates: templates.concat(res.result) }
        done?.(res.result._id)
        return
      }

      if (res.error) {
        toastStore.error(`Failed to create template: ${res.error}`)
      }
    },

    async *updateTemplate(
      { templates },
      id: string,
      update: { name: string; template: string; presetId?: string },
      done?: () => void
    ) {
      const res = await presetApi.updateTemplate(id, update)
      if (res.result) {
        const next = replace(id, templates, { name: update.name, template: update.template })
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

subscribe(
  'subscription-replaced',
  { subscriptionId: 'string', replacementId: 'string' },
  (body) => {
    const { presets } = presetStore.getState()

    const next = presets.map((pre) => {
      if (pre.registered?.agnaistic?.subscriptionId !== body.subscriptionId) return pre
      const preset = { ...pre }
      preset.registered!.agnaistic!.subscriptionId = body.replacementId
      return preset
    })

    presetStore.setState({ presets: next })
  }
)

type SafePreset = Pick<
  AppSchema.UserGenPreset,
  | 'addBosToken'
  | 'antiBond'
  | 'banEosToken'
  | 'cfgOppose'
  | 'cfgScale'
  | 'disabledSamplers'
  | 'doSample'
  | 'earlyStopping'
  | 'encoderRepitionPenalty'
  | 'epsilonCutoff'
  | 'etaCutoff'
  | 'frequencyPenalty'
  | 'gaslight'
  | 'ignoreCharacterSystemPrompt'
  | 'ignoreCharacterUjb'
  | 'kind'
  | 'maxContextLength'
  | 'maxTokens'
  | 'memoryChatEmbedLimit'
  | 'memoryContextLimit'
  | 'memoryDepth'
  | 'memoryReverseWeight'
  | 'memoryUserEmbedLimit'
  | 'minP'
  | 'mirostatLR'
  | 'mirostatTau'
  | 'mirostatToggle'
  | 'modelFormat'
  | 'numBeams'
  | 'order'
  | 'penaltyAlpha'
  | 'phraseBias'
  | 'phraseRepPenalty'
  | 'prefixNameAppend'
  | 'prefill'
  | 'promptOrder'
  | 'promptOrderFormat'
  | 'presencePenalty'
  | 'repetitionPenalty'
  | 'repetitionPenaltyRange'
  | 'repetitionPenaltySlope'
  | 'service'
  | 'skipSpecialTokens'
  | 'trimStop'
  | 'stopSequences'
  | 'tailFreeSampling'
  | 'temp'
  | 'streamResponse'
  | 'swipesPerGeneration'
  | 'systemPrompt'
  | 'topA'
  | 'topK'
  | 'topP'
  | 'typicalP'
  | 'ultimeJailbreak'
  | 'useAdvancedPrompt'
  | 'dynatemp_range'
  | 'dynatemp_exponent'
  | 'smoothingFactor'
  | 'smoothingCurve'
  | 'presetMode'
  | 'arliModel'
  | 'disableNameStops'
  | 'dryAllowedLength'
  | 'dryBase'
  | 'dryMultiplier'
  | 'drySequenceBreakers'
  | 'dryRange'
  | 'featherlessModel'
  | 'thirdPartyFormat'
  | 'description'
  | 'googleModel'
  | 'name'
  | 'json'
  | 'jsonEnabled'
  | 'localRequests'
  | 'registered'
  | 'xtcProbability'
  | 'xtcThreshold'
  | 'tokenHealing'
  | 'tempLast'
  | 'useMaxContext'
>

export async function exportPreset(preset: AppSchema.UserGenPreset) {
  const {
    registered,
    _id,
    oaiModel,
    novelModel,
    userId,
    claudeModel,
    mistralModel,
    thirdPartyModel,
    thirdPartyKey,
    thirdPartyFormat,
    thirdPartyUrl,
    thirdPartyUrlNoSuffix,
    openRouterModel,
    replicateModelName,
    replicateModelType,
    replicateModelVersion,
    temporary,
    src,
    ...json
  } = preset

  const safe: SafePreset = json

  if ('chatId' in safe) {
    delete safe.chatId
  }

  if (registered?.agnaistic) {
    safe.registered = {
      agnaistic: registered.agnaistic,
    }
  }

  downloadJson(safe, `preset-${_id.slice(0, 4)}`)
}
