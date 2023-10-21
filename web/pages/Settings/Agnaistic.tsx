import { Component, Show, createMemo } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { settingStore, userStore } from '/web/store'
import Select from '/web/shared/Select'
import { AppSchema } from '/common/types'

export const AgnaisticSettings: Component<{
  service: AIAdapter
  onSave: () => void
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

  return (
    <Show when={props.service === 'agnaistic'}>
      <Select
        label="Model"
        items={opts()}
        fieldName="registered.agnaistic.subscriptionId"
        onChange={props.onSave}
        value={props.inherit?.registered?.agnaistic?.subscriptionId}
      />
    </Show>
  )
}
