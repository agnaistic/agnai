import { getContextLimit } from '../../common/prompt'
import { presetStore, userStore } from '../store'
import { AppSchema } from '../../common/types/schema'
import { defaultPresets, isDefaultPreset } from '../../common/default-preset'
import { Option } from './Select'
import { ADAPTER_LABELS, AIAdapter, AdapterSetting, getAdapter } from '../../common/adapters'
import { storage } from './util'
import { getPresetConnection, getProviderCategoryLabel, getProviderLabel } from '/common/providers'
import { getStore } from '../store/create'
import { getChatPreset } from '../pages/Chat/util'

const tempSettings: { [key in AIAdapter]?: Array<AdapterSetting> } = {
  novel: [
    {
      field: 'module',
      label: 'AI Module',
      secret: false,
      setting: {
        type: 'list',
        options: [
          { label: 'None', value: 'vanilla' },
          { label: 'Instruct', value: 'special_instruct' },
          { label: 'Prose', value: 'special_proseaugmenter' },
          { label: 'Text Adventure', value: 'theme_textadventure' },
        ],
      },
    },
  ],
}

export const AutoPreset = {
  chat: 'chat',
  service: 'horde',
}

export type PresetOption = Option & { custom: boolean; name: string; provider: string }

export const BasePresetOptions: PresetOption[] = [
  {
    label: 'System Built-in Preset (Horde)',
    value: AutoPreset.service,
    custom: false,
    name: 'System Built-in Preset',
    provider: 'Horde',
  },
]

export type PresetInfo = {
  preset: Partial<AppSchema.UserGenPreset>
  adapter: AIAdapter
  model: string
  contextLimit: number
  name?: string
  presetLabel: string
  isThirdParty?: boolean
}

export function getDefaultUserPreset() {
  const { user } = userStore.getState()
  const preset = getUserPreset(user?.defaultPreset)
  return preset
}

export function getUserPreset(presetId?: string): Partial<AppSchema.GenSettings> | undefined {
  if (!presetId) return
  if (isDefaultPreset(presetId)) return defaultPresets[presetId]

  const { presets } = presetStore.getState()
  return presets.find((pre) => pre._id === presetId)
}

export function getClientPreset(chat?: AppSchema.Chat): PresetInfo | undefined {
  const user = userStore.getState()
  const presets = presetStore.getState().presets

  if (!chat || !user.user) return

  const preset = getChatPreset(chat, user.user, presets)
  const { adapter, isThirdParty, model, preset: presetLabel } = getAdapter(chat, user.user, preset)
  const contextLimit = getContextLimit(user.user, preset)

  const name = preset && 'name' in preset ? preset.name : ''
  return { preset, adapter, model, isThirdParty, contextLimit, presetLabel, name }
}

export function getPresetOptions(
  userPresets: AppSchema.UserGenPreset[],
  includes: { builtin?: boolean; base?: boolean }
): PresetOption[] {
  const user = userStore.getState().user || { defaultPreset: '', providers: [] }
  const presets = userPresets.slice().map((preset) => ({
    label: `[${getPresetProviderName(preset, user.providers)}] ${preset.name} ${
      user.defaultPreset === preset._id ? '★' : ''
    }`,
    value: preset._id,
    custom: true,
    name: preset.name,
    provider: getPresetProviderName(preset, user.providers),
  }))

  const defaults = Object.entries(defaultPresets).map(([_id, preset]) => ({
    ...preset,
    _id,
    name: preset.name,
  }))

  if (includes.builtin) {
    const builtinOptions = defaults.map((preset) => ({
      label: `[${getServiceName(preset.service)}] ${preset.name}`,
      value: preset._id,
      custom: false,
      name: preset.name,
      provider: getServiceName(preset.service),
    }))

    presets.push(...builtinOptions)
  }

  if (includes.base) presets.unshift(...BasePresetOptions)

  return presets.sort(sortByLabel)
}

export function getInitialPresetValue(chat?: AppSchema.Chat) {
  if (!chat) return AutoPreset.service
  if (!chat.genPreset && chat.genSettings) return AutoPreset.chat

  return chat.genPreset || AutoPreset.service
}

export function getServiceName(service?: AIAdapter) {
  if (!service) return 'Unset'
  return `${ADAPTER_LABELS[service]}`
}

export function getPresetLabel(preset: AppSchema.GenSettings) {
  const providers = getStore('user').getState().user?.providers
  const conn = getPresetConnection(preset, providers)

  const prefix = conn.provider?.name || conn.detail?.name || ADAPTER_LABELS[conn.service!]
  const catLabel = getProviderCategoryLabel(conn.category)

  return {
    prefix,
    type: conn.category,
    category: catLabel,
    desc: preset.name || 'Unnamed',
    conn,
  }
}

export function sortByName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}

export function sortByLabel(left: { label: string }, right: { label: string }) {
  return left.label.localeCompare(right.label)
}

export function getServiceTempConfig(service?: AIAdapter) {
  if (!service) return []

  const cfg = tempSettings[service]
  if (!cfg) return []

  const values: Array<AdapterSetting & { value: any }> = []
  for (const opt of cfg) {
    const prev = storage.localGetItem(`${service}.temp.${opt.field}`)
    values.push({ ...opt, preset: true, value: prev ? JSON.parse(prev) : undefined })
  }

  return values
}

function getPresetProviderName(preset: AppSchema.GenSettings, providers?: AppSchema.Provider[]) {
  if (preset.providerId) {
    if (preset.providerId === 'agnaistic') return 'Agnaistic'
    const provider = providers?.find((p) => p._id === preset.providerId)
    const label = provider ? getProviderLabel(provider) : 'Unknown'
    return label
  }

  return getServiceName(preset.service)
}
