import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { chatStore, presetStore, settingStore, userStore } from '/web/store'
import { CustomOption, CustomSelect } from '../CustomSelect'
import { getSubscriptionModelLimits } from '/common/util'
import {
  SubscriptionModelLevel,
  SubscriptionModelOption,
  SubscriptionTier,
} from '/common/types/presets'
import { ChevronDown } from 'lucide-solid'
import { SubCTA } from '/web/Navigation'
import { applyStoreProperty, createEmitter } from '../util'
import { isDefaultPreset } from '/common/presets'
import { Field } from './Fields'
import { useAppContext } from '/web/store/context'

export const AgnaisticSettings: Field<{ noSave: boolean }> = (props) => {
  const opts = useModelOptions()
  const [ctx] = useAppContext()

  const onSave = (value: string) => {
    if (props.noSave) {
      const next = applyStoreProperty(props.state.registered, 'agnaistic.subscriptionId', value)
      props.setter('registered', next)
      return
    }
    presetStore.updateRegisterPresetProp(props.state._id, 'agnaistic', 'subscriptionId', value)
    props.setter(
      'registered',
      applyStoreProperty(props.state.registered, 'agnaistic.subscriptionId', value)
    )
  }

  createEffect(
    on(
      () => ctx.preset?.registered?.agnaistic?.subscriptionId,
      (id) => {
        if (!ctx.preset?._id || !id) return
        if (ctx.preset._id !== props.state._id) return

        const curr = props.state.registered?.agnaistic?.subscriptionId
        if (id === curr) return

        props.setter(
          'registered',
          applyStoreProperty(props.state.registered, 'agnaistic.subscriptionId', id)
        )
      }
    )
  )

  const emitter = createEmitter('close')

  const label = createMemo(() => {
    const id = props.state.registered?.agnaistic?.subscriptionId
    let opt = opts().find((v) => v.value === id)

    if (!opt) {
      opt = opts().find((v) => v.sub.preset.isDefaultSub)
    }

    if (!opt) {
      return <div>None</div>
    }
    return (
      <ModelLabel
        sub={opt?.sub!}
        limit={opt?.limit}
        nodesc
        tier={opt.tierName}
        disabled={opt.disabled}
        requires={opt.requires}
      />
    )
  })

  return (
    <Show when={props.state.service === 'agnaistic'}>
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
        label={
          <>
            Model <span class="text-500 text-xs italic">(Available: {opts().length})</span>
          </>
        }
        options={opts()}
        onSelect={(ev) => onSave(ev.value)}
        value={props.state.registered?.agnaistic?.subscriptionId}
        selected={props.state.registered?.agnaistic?.subscriptionId}
        emitter={emitter.on}
      />
    </Show>
  )
}

export const AgnaisticModel: Component = (props) => {
  const [ctx] = useAppContext()

  const [selected, setSelected] = createSignal(ctx.preset?.registered?.agnaistic?.subscriptionId)
  const opts = useModelOptions()

  createEffect(
    on(
      () => ctx.preset?.registered?.agnaistic?.subscriptionId,
      (id) => {
        setSelected(id)
      }
    )
  )

  const onSave = (opt: CustomOption) => {
    const chat = chatStore.getState().active

    if (isDefaultPreset(ctx.preset?._id)) {
      const create = {
        ...ctx.preset,
        name: `My Preset`,
        service: 'agnaistic' as const,
        chatId: chat?.chat._id,
        registered: {
          agnaistic: {
            subscriptionId: opt.value,
          },
        },
      }

      presetStore.createPreset(create, (preset) => {
        if (!ctx.chat?._id) return
        chatStore.setChat(ctx.chat._id, { genPreset: preset._id, genSettings: undefined })
      })
      return
    }

    presetStore.updatePreset(ctx.preset?._id!, {
      registered: { ...ctx.preset?.registered, agnaistic: { subscriptionId: opt.value } },
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
    <Show when={ctx.preset} fallback={null}>
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
        value={ctx.preset?.registered?.agnaistic?.subscriptionId}
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

    return (
      settings.config.subs
        .map((sub) => {
          const limit = getSubscriptionModelLimits(sub.preset, level)
          const disabled = !!sub.preset.allowGuestUsage ? false : sub.level > level
          const tier =
            sub.level <= 0
              ? 'Free'
              : state.tiers.reduce<SubscriptionTier | null>((prev, curr) => {
                  if (prev?.level === sub.level) return prev
                  if (curr.level === sub.level) return curr
                  if (curr.level < sub.level) return prev
                  if (!prev) return curr

                  // Return the lowest tier above the threshold
                  return prev.level > curr.level ? curr : prev
                }, null)?.name

          const requires = sub.level <= 0 ? 'Registering' : tier || 'Staff Only'
          return {
            label: (
              <ModelLabel
                sub={sub}
                limit={limit}
                disabled={disabled}
                tier={tier || 'Staff'}
                requires={requires}
              />
            ),
            value: sub._id,
            level: sub.level,
            sub,
            limit,
            disabled,
            tierName: tier || 'Staff',
            requires,
            title: sub.name,
          }
        })
        // Remove staff models from the list
        .filter((sub) => (sub.tierName === 'Staff' && !state.user?.admin ? false : true))
        .sort((l, r) => {
          if (l.disabled && !r.disabled) return 1
          if (r.disabled && !l.disabled) return -1
          // if (l.disabled && r.disabled) return l.title.localeCompare(r.title)
          if (l.level !== r.level) return l.level - r.level
          return l.title.localeCompare(r.title)
        })
    )
  })

  return opts
}

const ModelLabel: Component<{
  sub: SubscriptionModelOption
  tier: string
  requires: string
  limit?: SubscriptionModelLevel
  disabled: boolean
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
      <Show when={!props.disabled && !props.nodesc}>
        <div class="text-700 text-xs">
          {props.tier}
          {props.sub.preset.description ? ', ' : ''}
          {props.sub.preset.description}
        </div>
      </Show>
      <Show when={props.disabled}>
        <div class="text-700 text-xs">Requires {props.requires}</div>
      </Show>
    </div>
  )
}
