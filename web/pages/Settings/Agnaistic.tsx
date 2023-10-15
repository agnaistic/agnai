import { Component, Show, createMemo } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { presetStore, settingStore, userStore } from '/web/store'
import Select from '/web/shared/Select'
import { AppSchema } from '/common/types'

export const AgnaisticSettings: Component<{
  service: AIAdapter
  inherit?: Partial<AppSchema.UserGenPreset>
}> = (props) => {
  const state = userStore((s) => ({ user: s.user, tiers: s.tiers }))
  const config = settingStore((s) => s.config)

  const opts = createMemo(() => {
    const tier = state.tiers.find((s) => s._id === state.user?.sub?.tierId)
    const level = state.user?.admin ? Infinity : tier?.level ?? -1

    return config.subs
      .filter((sub) => sub.level <= level)
      .map((sub) => ({ label: sub.name, value: sub._id, level: sub.level }))
      .sort((l, r) => r.level - l.level)
  })

  const onChange = (value: string) => {
    if (!props.inherit?._id) return

    presetStore.updateRegisterPresetProp(props.inherit?._id, 'agnaistic', 'subscriptionId', value)
  }

  return (
    <Show when={props.service === 'agnaistic'}>
      <Select
        label="Model"
        items={opts()}
        fieldName="registered.agnaistic.subscriptionId"
        onChange={(ev) => onChange(ev.value)}
        value={props.inherit?.registered?.agnaistic?.subscriptionId}
      />
    </Show>
  )
}
