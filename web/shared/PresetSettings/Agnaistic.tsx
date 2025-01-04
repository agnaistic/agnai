import { Component, For, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
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
import { AppSchema } from '/common/types'
import { Pill } from '../Card'
import { RootModal } from '../Modal'

export const AgnaisticSettings: Field<{ noSave: boolean }> = (props) => {
  const state = userStore((s) => ({ tiers: s.tiers }))

  const cats = useModelCategories()
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
    let opt = cats().all.find((v) => v.value === id)

    if (!opt) {
      opt = cats().all.find((v) => v.sub.preset.isDefaultSub)
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
        tiers={state.tiers}
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
            Model <span class="text-500 text-xs italic">(Available: {cats().all.length})</span>
          </>
        }
        // options={opts()}
        categories={cats().categories}
        onSelect={(ev) => onSave(ev.value)}
        value={props.state.registered?.agnaistic?.subscriptionId}
        selected={props.state.registered?.agnaistic?.subscriptionId}
        emitter={emitter.on}
      />
    </Show>
  )
}

export const ModelList: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = userStore((s) => ({
    tiers: s.tiers,
  }))

  const cfg = settingStore((s) => ({
    images: s.allImageModels || [],
  }))

  const cats = useModelCategories()

  return (
    <RootModal show={props.show} close={props.close} maxWidth="half" title="Available Models">
      <div class="flex flex-col gap-2">
        <Show when={cfg.images.length > 0}>
          <div class="font-bold">Image Models</div>
          <div class="flex flex-col gap-2">
            <For each={cfg.images}>
              {(model) => (
                <div class="bg-700 w-full gap-4 rounded-md px-2 py-1 text-sm">
                  <div class="font-bold">{model.desc}</div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <For each={cats().categories}>
          {(cat) => (
            <>
              <div class="font-bold">{cat.name}</div>
              <div class="flex flex-col gap-2">
                <For each={cat.options}>
                  {(model) => (
                    <div class="bg-700 w-full gap-4 rounded-md px-2 py-1 text-sm">
                      <ModelLabel
                        tiers={state.tiers}
                        requires={model.requires}
                        disabled={model.disabled}
                        sub={model.sub}
                        tier={model.tierName}
                        limit={model.limit}
                      />
                    </div>
                  )}
                </For>
              </div>
            </>
          )}
        </For>
      </div>
    </RootModal>
  )
}

export const AgnaisticModel: Component = (props) => {
  const [ctx] = useAppContext()

  const [selected, setSelected] = createSignal(ctx.preset?.registered?.agnaistic?.subscriptionId)
  const cats = useModelCategories()

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
    let opt = cats().all.find((v) => v.value === id)

    if (!opt) {
      opt = cats().all.find((v) => v.sub.preset.isDefaultSub)
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
        categories={cats().categories}
        onSelect={onSave}
        value={ctx.preset?.registered?.agnaistic?.subscriptionId}
        selected={selected()}
        emitter={emitter.on}
      />
    </Show>
  )
}

type ModelOption = {
  value: string
  level: number
  sub: any
  limit?: SubscriptionModelLevel
  disabled: boolean
  tierName: string
  requires: string
  title: string
}

function useModelCategories() {
  const state = userStore((s) => ({
    user: s.user,
    tiers: s.tiers,
    sub: s.sub,
    userLevel: s.userLevel,
  }))

  const settings = settingStore()

  const list = createMemo(() => {
    const tierLevel = state.user?.admin ? Infinity : state.userLevel
    const level = state.user?.admin ? Infinity : tierLevel
    const all: Array<ModelOption> = []

    const cats = new Map<
      string,
      {
        options: Array<ModelOption & { label: any }>
        tier: number
      }
    >()

    for (const sub of settings.config.subs) {
      if (sub.preset.subDisabled && !state.user?.admin) continue

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
      const tierName = tier || 'Staff'

      const category = cats.get(tierName) || { tier: sub.level, options: [] }
      const base = {
        value: sub._id,
        level: sub.level,
        sub,
        limit,
        disabled,
        tierName: tier || 'Staff',
        requires,
        title: sub.name,
      }

      category.options.push({
        ...base,
        label: (
          <ModelLabel
            sub={sub}
            limit={limit}
            disabled={disabled}
            tier={tier || 'Staff'}
            requires={requires}
            tiers={state.tiers}
          />
        ),
      })

      all.push(base)
      cats.set(tierName, category)
    }

    const categories = Array.from(cats.entries())
      .sort((l, r) => l[1].tier - r[1].tier)
      .map(([name, item]) => ({
        name,
        options: item.options.sort((l, r) => l.title.localeCompare(r.title)),
      }))

    return { categories, all }
  })

  return list
}

const ModelLabel: Component<{
  sub: SubscriptionModelOption
  tier: string
  requires: string
  limit?: SubscriptionModelLevel
  disabled: boolean
  nodesc?: boolean
  tiers: AppSchema.SubscriptionTier[]
}> = (props) => {
  const context = createMemo(() =>
    props.limit ? props.limit.maxContextLength : props.sub.preset.maxContextLength!
  )
  const tokens = createMemo(() =>
    props.limit ? props.limit.maxTokens : props.sub.preset.maxTokens
  )

  const maxes = createMemo(() => {
    const pills: any[] = []
    if (!props.sub.preset.levels?.length) {
      pills.push(<>{tokens()} tokens</>)
      return pills
    }

    const levels = props.sub.preset.levels.slice()
    const baseIncluded = props.sub.preset.levels.find((l) => l.level === props.sub.preset.subLevel)
    if (!baseIncluded) {
      levels.push({
        level: props.sub.preset.subLevel,
        maxContextLength: props.sub.preset.maxContextLength!,
        maxTokens: props.sub.preset.maxTokens,
      })
    }

    levels.sort((l, r) => l.level - r.level)

    for (const level of levels) {
      const required = props.tiers.reduce<AppSchema.SubscriptionTier | null>((prev, curr) => {
        if (level.level <= 0) return null
        if (curr.level < level.level) return prev
        if (!prev) return curr
        // Return the minimum required
        return curr.level < prev.level ? curr : prev
      }, null)

      if (!required && props.sub.preset.subLevel > -1) continue
      const name = required ? required.name : level.level === 0 ? 'User' : 'Guest'

      pills.push(
        <Pill small class="text-xs" inverse>
          {name} {Math.floor(level.maxContextLength / 1000)}K
        </Pill>
      )
    }

    return pills
  })

  return (
    <div class="flex flex-col items-start">
      <div class="flex items-center justify-between gap-1">
        <div class="min-w-fit font-bold">{props.sub.name}</div>
        <div class="text-700 flex flex-wrap gap-1 text-xs">
          <Show
            when={maxes().length}
            fallback={
              <>
                {Math.floor(context() / 1000)}K, {tokens()} tokens
              </>
            }
          >
            <For each={maxes()}>{(max) => <>{max}</>}</For>
          </Show>
        </div>
      </div>
      <Show when={!props.disabled && !props.nodesc}>
        <div class="text-700 text-xs">{props.sub.preset.description}</div>
      </Show>
      <Show when={props.disabled}>
        <div class="text-700 text-xs">Requires {props.requires}</div>
      </Show>
    </div>
  )
}
