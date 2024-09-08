import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { settingStore, userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { CustomSelect } from '../CustomSelect'
import { getSubscriptionModelLimits } from '/common/util'
import { SubscriptionModelLevel, SubscriptionModelOption } from '/common/types/presets'
import { forms } from '/web/emitter'

export const AgnaisticSettings: Component<{
  service: AIAdapter
  onSave: () => void
  inherit?: Partial<AppSchema.UserGenPreset>
}> = (props) => {
  const state = userStore((s) => ({
    user: s.user,
    tiers: s.tiers,
    sub: s.sub,
    userLevel: s.userLevel,
  }))
  const settings = settingStore()

  const [selected, setSelected] = createSignal(props.inherit?.registered?.agnaistic?.subscriptionId)

  const opts = createMemo(() => {
    const tierLevel = state.user?.admin ? Infinity : state.userLevel
    const level = state.user?.admin ? Infinity : tierLevel

    return settings.config.subs
      .filter((sub) => (!!sub.preset.allowGuestUsage ? true : sub.level <= level))
      .map((sub) => {
        const limit = getSubscriptionModelLimits(sub.preset, level)

        return {
          label: <ModelLabel sub={sub} limit={limit} />,
          value: sub._id,
          level: sub.level,
          sub,
          limit,
        }
      })
      .sort((l, r) => r.level - l.level)
  })

  forms.useSub((field, value) => {
    if (field !== 'registered.agnaistic.subscriptionId') return
    setSelected(value)
  })

  createEffect(
    on(
      () => props.inherit?.registered?.agnaistic?.subscriptionId,
      (id) => {
        setSelected(id)
      }
    )
  )

  const label = createMemo(() => {
    const id = selected()
    let opt = opts().find((v) => v.value === id)

    if (!opt) {
      opt = opts().find((v) => v.sub.preset.isDefaultSub)
    }

    if (!opt) {
      return <div>None</div>
    }
    return <ModelLabel sub={opt?.sub!} limit={opt?.limit} nodesc />
  })

  return (
    <Show when={props.service === 'agnaistic'}>
      <CustomSelect
        buttonLabel={label()}
        modalTitle="Select a Model"
        label="Model"
        helperText={<span class="text-500">Available: {opts().length}</span>}
        options={opts()}
        onSelect={props.onSave}
        value={props.inherit?.registered?.agnaistic?.subscriptionId}
        fieldName="registered.agnaistic.subscriptionId"
        selected={selected()}
      />
    </Show>
  )
}

const ModelLabel: Component<{
  sub: SubscriptionModelOption
  limit?: SubscriptionModelLevel
  nodesc?: boolean
}> = (props) => {
  const context = createMemo(() =>
    props.limit ? props.limit.maxContextLength : props.sub.preset.maxContextLength!
  )
  const tokens = createMemo(() =>
    props.limit ? props.limit.maxTokens : props.sub.preset.maxTokens
  )

  return (
    <div class="flex flex-col items-start">
      <div class="flex items-center justify-between gap-1">
        <div class="font-bold">{props.sub.name}</div>
        <div class="text-500 text-xs">
          {Math.floor(context() / 1000)}K, {tokens()} tokens
        </div>
      </div>
      <Show when={props.sub.preset.description && !props.nodesc}>
        <div class="text-500 text-xs">{props.sub.preset.description}</div>
      </Show>
    </div>
  )
}
