import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { presetStore, settingStore, userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { CustomOption, CustomSelect } from '../CustomSelect'
import { getSubscriptionModelLimits } from '/common/util'
import { SubscriptionModelLevel, SubscriptionModelOption } from '/common/types/presets'
import { forms } from '/web/emitter'
import { ChevronDown } from 'lucide-solid'
import { SubCTA } from '/web/Navigation'
import { createEmitter } from '../util'

export const AgnaisticSettings: Component<{
  service: AIAdapter
  onSave: () => void
  inherit?: Partial<AppSchema.UserGenPreset>
}> = (props) => {
  const [selected, setSelected] = createSignal(props.inherit?.registered?.agnaistic?.subscriptionId)
  const opts = useModelOptions()

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

  const emitter = createEmitter('close')

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
        size="sm"
        buttonLabel={label()}
        modalTitle={
          <div class="flex w-full flex-col">
            <div>Select a Model</div>
            <div class="flex justify-center">
              <SubCTA onClick={emitter.emit.close}>Subscribe for higher quality models</SubCTA>
            </div>
          </div>
        }
        label="Model"
        helperText={<span class="text-500">Available: {opts().length}</span>}
        options={opts()}
        onSelect={props.onSave}
        value={props.inherit?.registered?.agnaistic?.subscriptionId}
        fieldName="registered.agnaistic.subscriptionId"
        selected={selected()}
        emitter={emitter.on}
      />
    </Show>
  )
}

export const AgnaisticModel: Component<{ inherit?: AppSchema.UserGenPreset }> = (props) => {
  const [selected, setSelected] = createSignal(props.inherit?.registered?.agnaistic?.subscriptionId)
  const opts = useModelOptions()

  forms.useSub((field, value) => {
    if (field !== 'agnaistic_modelId') return
    setSelected(value)
  })

  const onSave = (opt: CustomOption) => {
    presetStore.updatePreset(props.inherit?._id!, {
      registered: { ...props.inherit?.registered, agnaistic: { subscriptionId: opt.value } },
    })
  }

  const label = createMemo(() => {
    const id = selected()
    let opt = opts().find((v) => v.value === id)

    if (!opt) {
      opt = opts().find((v) => v.sub.preset.isDefaultSub)
    }

    return (
      <>
        <span class="font-bold">Model:</span> {opt?.sub.name || 'Default'} <ChevronDown size={12} />
      </>
    )
  })

  const emitter = createEmitter('close')

  return (
    <Show when={props.inherit} fallback={null}>
      <CustomSelect
        size="sm"
        buttonLabel={label()}
        modalTitle={
          <div class="flex w-full flex-col">
            <div>Select a Model</div>
            <div class="flex justify-center">
              <SubCTA onClick={emitter.emit.close}>Subscribe for higher quality models</SubCTA>
            </div>
          </div>
        }
        options={opts()}
        onSelect={onSave}
        value={props.inherit?.registered?.agnaistic?.subscriptionId}
        fieldName="agnaistic_modelId"
        selected={selected()}
        emitter={emitter.on}
      />
    </Show>
  )
}

function useModelOptions() {
  const state = userStore((s) => ({
    user: s.user,
    tiers: s.tiers,
    sub: s.sub,
    userLevel: s.userLevel,
  }))
  const settings = settingStore()

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

  return opts
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
        <div class="text-700 text-xs">
          {Math.floor(context() / 1000)}K, {tokens()} tokens
        </div>
      </div>
      <Show when={props.sub.preset.description && !props.nodesc}>
        <div class="text-700 text-xs">{props.sub.preset.description}</div>
      </Show>
    </div>
  )
}
