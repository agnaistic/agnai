import { Component, createMemo } from 'solid-js'
import { ADAPTER_LABELS, AIAdapter } from '../../../../common/adapters'
import { defaultPresets } from '../../../../common/presets'
import Select from '../../../shared/Select'
import { userStore } from '../../../store'
import { presetStore } from '../../../store'
import { useTransContext } from '@mbarzda/solid-i18next'

export const AIPreset: Component<{ adapter: AIAdapter }> = (props) => {
  const [t] = useTransContext()

  const presets = presetStore((s) => ({ list: s.presets }))
  const user = userStore()

  const options = createMemo(() => {
    const base = [{ label: 'None', value: '' }]
    const userPresets = presets.list.map((pre) => ({ label: pre.name, value: pre._id }))
    const defaults = Object.entries(defaultPresets).map(([name, cfg]) => ({
      label: t('default_:_x', { name: cfg.name }),
      value: name,
    }))

    return base.concat(userPresets.concat(defaults))
  })

  return (
    <>
      <Select
        fieldName={`preset.${props.adapter}`}
        label={t('default_preset_x', { name: ADAPTER_LABELS(t)[props.adapter] })}
        items={options()}
        value={user.user?.defaultPresets?.[props.adapter] || ''}
      />
    </>
  )
}
