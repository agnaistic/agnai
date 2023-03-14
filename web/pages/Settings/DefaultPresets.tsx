import { Component, createMemo, For } from 'solid-js'
import { ADAPTER_LABELS, AI_ADAPTERS } from '../../../common/adapters'
import { defaultPresets } from '../../../common/presets'
import Divider from '../../shared/Divider'
import Dropdown from '../../shared/Dropdown'
import { settingStore, userStore } from '../../store'
import { presetStore } from '../../store/presets'

export const DefaultPresets: Component = () => {
  const presets = presetStore((s) => ({ list: s.presets }))
  const user = userStore()
  const cfg = settingStore()

  const options = createMemo(() => {
    const base = [{ label: 'None', value: '' }]
    const userPresets = presets.list.map((pre) => ({ label: pre.name, value: pre._id }))
    const defaults = Object.entries(defaultPresets).map(([name, cfg]) => ({
      label: `Default: ${cfg.name}`,
      value: name,
    }))

    return base.concat(userPresets.concat(defaults))
  })

  return (
    <>
      <Divider />
      <h3 class="text-xl">Default Service Presets</h3>
      <For each={cfg.config.adapters}>
        {(adp) => (
          <Dropdown
            fieldName={`preset.${adp}`}
            label={ADAPTER_LABELS[adp]}
            items={options()}
            value={user.user?.defaultPresets?.[adp] || ''}
          />
        )}
      </For>
    </>
  )
}
