import { getAdapter, getChatPreset } from '../../common/prompt'
import { presetStore, userStore } from '../store'
import { AppSchema } from '../../srv/db/schema'
import { defaultPresets } from '../../common/presets'
import { Option } from './Select'
import { ADAPTER_LABELS, AIAdapter } from '../../common/adapters'

export const AutoPreset = {
  chat: 'chat',
  service: 'horde',
}

export const BasePresetOptions: Option[] = [
  { label: 'Chat Settings', value: AutoPreset.chat },
  { label: 'System Built-in Preset (Horde)', value: AutoPreset.service },
]

export function getClientPreset(chat?: AppSchema.Chat) {
  const user = userStore()
  const presets = presetStore((s) => s.presets)

  if (!chat || !user.user) return

  const preset = getChatPreset(chat, user.user, presets)
  const {
    adapter,
    isThirdParty,
    model,
    contextLimit,
    preset: presetLabel,
  } = getAdapter(chat, user.user, preset)

  const name = 'name' in preset ? preset.name : ''
  return { preset, adapter, model, isThirdParty, contextLimit, presetLabel, name }
}

export function getPresetOptions(userPresets: AppSchema.UserGenPreset[]) {
  const user = userStore((u) => u.user || { defaultPreset: '' })
  const presets = userPresets.map((preset) => ({
    label: `${user.defaultPreset === preset._id ? 'Your Default - ' : ''}${
      preset.name
    } ${getServiceName(preset.service)}`,
    value: preset._id,
  }))

  const defaults = Object.entries(defaultPresets).map(([_id, preset]) => ({
    ...preset,
    _id,
    name: `Default - ${preset.name} ${getServiceName(preset.service)}`,
  }))

  const defaultsOptions = defaults.map((preset) => ({
    label: preset.name,
    value: preset._id,
  }))

  return BasePresetOptions.concat(presets).concat(defaultsOptions)
}

export function getInitialPresetValue(chat?: AppSchema.Chat) {
  if (!chat) return AutoPreset.service
  if (!chat.genPreset && chat.genSettings) return AutoPreset.chat

  return chat.genPreset || AutoPreset.service
}

function getServiceName(service?: AIAdapter) {
  if (!service) return ''
  return `(${ADAPTER_LABELS[service]})`
}
