import { Component, createMemo, createSignal, onMount } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { chatStore, presetStore, toastStore } from '../../store'
import { isDefaultPreset } from '../../../common/presets'
import { isEligible } from './util'
import { useTransContext } from '@mbarzda/solid-i18next'

const ForcePresetModal: Component<{ chat: AppSchema.Chat; show: boolean; close: () => void }> = (
  props
) => {
  const [t] = useTransContext()

  const presets = presetStore((s) => s.presets)

  const options = createMemo(() => {
    const opts = getPresetOptions(t, presets, { builtin: true }).filter(
      (pre) => pre.value !== 'chat'
    )
    return [{ label: t('system_built_in_preset_horde'), value: AutoPreset.service }].concat(opts)
  })

  const [presetId, setPresetId] = createSignal(props.chat.genPreset || options()[0].value)
  const [preset] = createSignal<AppSchema.UserGenPreset>()
  const [service] = createSignal<string>()

  const savePreset = () => {
    const id = presetId()
    if (!id) {
      toastStore.error(t('please_select_a_preset'))
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
