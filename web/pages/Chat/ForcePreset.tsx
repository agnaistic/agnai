import { Component, createMemo, createSignal, onMount } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { chatStore, presetStore, settingStore, toastStore } from '../../store'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { isEligible } from './util'

const ForcePresetModal: Component<{ chat: AppSchema.Chat; show: boolean; close: () => void }> = (
  props
) => {
  let ref: any
  const presets = presetStore((s) => s.presets)
  const adapters = settingStore((s) => s.config.adapters)

  const options = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter((pre) => pre.value !== 'chat')
    return [{ label: 'System Built-in Preset (Horde)', value: AutoPreset.service }].concat(opts)
  })

  const [presetId, setPresetId] = createSignal(props.chat.genPreset || options()[0].value)
  const [preset, setPreset] = createSignal<AppSchema.UserGenPreset>()
  const [service, setService] = createSignal<string>()
  const [actual, setActual] = createSignal<AppSchema.GenSettings>()

  const services = createMemo(() => {
    const list = adapters.map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return [{ label: 'None', value: '' }].concat(list)
  })

  const savePreset = () => {
    const id = presetId()
    if (!id) {
      toastStore.error(`Please select a preset`)
      return
    }

    chatStore.editChatGenPreset(props.chat._id, id, props.close)

    const userPreset = preset()
    const svc = service()
    if (userPreset && !isDefaultPreset(userPreset._id)) {
      if (!svc) return

      presetStore.updatePreset(userPreset._id, { service: svc as any })
    }
  }

  const onPresetChange = (id: string) => {
    setPresetId(id)

    const userPreset = presets.find((p) => p._id === id)
    const actualPreset = userPreset
      ? userPreset
      : isDefaultPreset(id)
      ? defaultPresets[id]
      : undefined

    setActual(actualPreset as any)
    setService(userPreset?.service || '')
    setPreset(userPreset as any)
  }

  onMount(() => {
    const eligible = isEligible()
    if (!eligible) {
      setPresetId('horde')
      savePreset()
      return
    }

    setPresetId('agnai')
    savePreset()
  })

  return null
}

export default ForcePresetModal
