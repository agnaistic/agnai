import { Component, For, Show, createMemo } from 'solid-js'
import { settingStore, toastStore, userStore } from '/web/store'
import { CustomSelect } from '../CustomSelect'
import { getSubscriptionModelLimits } from '/common/util'
import {
  SubscriptionModelLevel,
  SubscriptionModelOption,
  SubscriptionTier,
} from '/common/types/presets'
import { SubCTA } from '/web/Navigation'
import { createEmitter } from '../util'
import { useAppContext } from '/web/store/context'
import { AppSchema } from '/common/types'
import { Pill } from '../Card'
import { RootModal } from '../Modal'
import { PresetFuncs, ContextPreset } from '/web/store/preset-context'

const MODEL_NAMES = new Map<string, string>()

export const AgnaisticSettings: Component<{
  state: ContextPreset
  setters: PresetFuncs
  noSave: boolean
  page?: string
}> = (props) => {
  const [appctx] = useAppContext()
  const state = userStore((s) => ({ tiers: s.tiers }))
  const models = settingStore((s) => ({ list: s.config.subs || [] }))

  const fallback = createMemo(() => {
    const fb = models.list.find((m) => m.preset.isDefaultSub)
    return fb?._id
  })

  const cats = useModelCategories()

  const onSave = (value: string) => {
    const models = props.state.providerModels || {}
    const next = { ...models, agnaistic: value }
    props.setters.setState('providerModels', next)

    if (props.noSave) {
      return
    }

    props.setters.upsert({
      quiet: true,
      onCreated: (preset) => {
        toastStore.success('Preset created')

        if (!appctx.chat?._id) return
        props.setters.change({ chatId: appctx.chat._id, presetId: preset._id })
      },
      onUpdated: () => toastStore.success('Model updated'),
    })

    // presetStore.updatePreset(props.state._id, { providerModels: next })
  }

  const emitter = createEmitter('close')

  const label = createMemo(() => {
    const id =
      props.state.providerModels?.agnaistic ?? props.state.registered?.agnaistic?.subscriptionId
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
        page={props.page}
      />
    )
  })

  return (
    <Show when={props.state.providerId === 'agnaistic' || props.state.service === 'agnaistic'}>
      <div class="flex items-center gap-2">
        <CustomSelect
          size="sm"
          buttonLabel={label()}
          modalTitle={
            <div class="flex w-full flex-col">
              <div class="flex justify-center">
                <SubCTA onClick={emitter.emit.close}>Subscribe for higher quality models</SubCTA>
              </div>
            </div>
          }
          // options={opts()}
          search={isFoundModel}
          categories={cats().categories}
          onSelect={(ev) => onSave(ev.value)}
          selected={
            props.state.providerModels?.agnaistic ??
            props.state.registered?.agnaistic?.subscriptionId ??
            fallback()
          }
          closeSub={emitter.on}
        />
      </div>
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

function isFoundModel(compare: string, input: string) {
  const name = MODEL_NAMES.get(compare)?.toLowerCase()
  if (!name) return true

  const words = input.split(' ').map((w) => w.toLocaleLowerCase())

  for (const word of words) {
    if (!name.includes(word)) return false
  }

  return true
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

  const settings = settingStore((s) => ({ config: s.config }))

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
      const disabled = !!sub.preset.allowGuestUsage
        ? false
        : (limit?.level ?? sub.preset.subLevel) > level
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
      MODEL_NAMES.set(sub._id, sub.name)
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
      // Sort by the highest tier descending, grouping by tiers with available models
      .sort((l, r) => {
        const left = l[1].options.some((o) => !o.disabled)
        const right = r[1].options.some((o) => !o.disabled)

        if ((!left && !right) || (left && right)) return r[1].tier - l[1].tier
        return !left ? -1 : 1
      })
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
  page?: string
}> = (props) => {
  const context = createMemo(() =>
    props.limit ? props.limit.maxContextLength : props.sub.preset.maxContextLength!
  )
  const tokens = createMemo(() =>
    props.limit ? props.limit.maxTokens : props.sub.preset.maxTokens
  )

  const maxes = createMemo(() => {
    const pills: any[] = []
    const levels = (props.sub.preset.levels || []).slice()
    const baseIncluded = props.sub.preset.levels.find((l) => l.level === props.sub.preset.subLevel)
    if (!baseIncluded) {
      levels.push({
        level: props.sub.preset.subLevel,
        maxContextLength: props.sub.preset.maxContextLength!,
        maxTokens: props.sub.preset.maxTokens,
      })
    }

    if (!levels.length) {
      pills.push(
        <>
          {tokens()} tokens, {tokens()} tokens
        </>
      )
      return pills
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

      if (!required && props.sub.preset.subLevel > -1) {
        pills.push(
          <Pill small class="text-xs" inverse>
            All {Math.round(level.maxContextLength / 1000)}K
          </Pill>
        )
        continue
      }
      const name = required ? required.name : level.level === 0 ? 'User' : 'All'

      pills.push(
        <Pill small class="text-xs" inverse>
          {name} {Math.round(level.maxContextLength / 1000)}K
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
            when={maxes().length && !props.page}
            fallback={<>{Math.round(context() / 1000)}K</>}
          >
            <For each={maxes()}>{(max) => <>{max}</>}</For>
          </Show>
        </div>
      </div>
      <Show when={!props.disabled && !props.nodesc}>
        <div class="text-700 text-xs">
          {tokens()} tokens{props.sub.preset.description ? `, ${props.sub.preset.description}` : ''}
        </div>
      </Show>
      <Show when={props.disabled}>
        <div class="text-700 text-xs">Requires {props.requires}</div>
      </Show>
    </div>
  )
}
