import { Component, Show, createMemo } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { settingStore, userStore } from '/web/store'
import Select from '/web/shared/Select'
import { AppSchema } from '/common/types'
import { getUserSubscriptionTier } from '/common/util'

export const AgnaisticSettings: Component<{
  service: AIAdapter
  onSave: () => void
  inherit?: Partial<AppSchema.UserGenPreset>
}> = (props) => {
  const state = userStore((s) => ({ user: s.user, tiers: s.tiers, sub: s.sub }))
  const settings = settingStore()

  const opts = createMemo(() => {
    const tier = state.user ? getUserSubscriptionTier(state.user!, state.tiers) : undefined
    const tierLevel = tier?.level ?? -1
    const level = state.user?.admin ? Infinity : tierLevel

    return settings.config.subs
      .filter((sub) => sub.level <= level)
      .filter((sub) => (level === -1 ? !!sub.preset.allowGuestUsage : true))
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
