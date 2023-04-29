import { getAdapter, getChatPreset } from '../../common/prompt'
import { presetStore, userStore } from '../store'
import { AppSchema } from '../../srv/db/schema'
import { defaultPresets } from '../../common/presets'
import { Option } from './Select'
import { ADAPTER_LABELS, AIAdapter } from '../../common/adapters'

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
  const base: Option[] = [
    { label: 'Chat Settings', value: 'chat' },
    { label: 'Service or Fallback Preset', value: 'service' },
  ]

  const presets = userPresets.map((preset) => ({
    label: `${preset.name} ${getServiceName(preset.service)}`,
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

  return base.concat(presets).concat(defaultsOptions)
}

export function getInitialPresetValue(chat?: AppSchema.Chat) {
  if (!chat) return 'service'
  if (!chat.genPreset && chat.genSettings) return 'chat'

  return chat.genPreset || 'service'
}

function getServiceName(service?: AIAdapter) {
  if (!service) return ''
  return `(${ADAPTER_LABELS[service]})`
}
