import { A, useNavigate } from '@solidjs/router'
import { Copy, Plus, Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { adminStore, presetStore, userStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'
import { getServiceName, sortByLabel } from '/web/shared/adapter'
import Divider from '/web/shared/Divider'
import { Pill, SolidCard } from '/web/shared/Card'
import { Page } from '/web/Layout'
import { SubscriptionModel, SubscriptionModelLevel } from '/common/types/presets'

const SubscriptionList: Component = () => {
  setComponentPageTitle('Subscriptions')
  const nav = useNavigate()
  const state = presetStore((s) => {
    return {
      enabled: s.subs
        .filter((s) => !s.subDisabled)
        .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
        .sort(sortByLabel),
      disabled: s.subs
        .filter((s) => s.subDisabled)
        .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
        .sort(sortByLabel),
    }
  })

  const cfg = userStore()

  const [deleting, setDeleting] = createSignal<string>()
  const subCats = createMemo(() => {
    const cats = new Map<number, Array<SubscriptionModel & { label: string }>>()

    for (const sub of state.enabled) {
      let level = sub.levels.reduce<number | null>(
        (prev, curr) => (prev === null ? curr.level : curr.level < prev ? curr.level : prev),
        null
      )

      if (level === null) {
        level = sub.subLevel
      }

      if (!cats.has(level)) {
        cats.set(level, [])
      }

      const list = cats.get(level)
      list!.push(sub)
      cats.set(level, list!)
    }

    const all = Array.from(cats.entries())
      .sort((l, r) => l[0] - r[0])
      .map(([level, list]) => ({
        name: `Tier ${level}`,
        list: list.sort((l, r) => l.name.localeCompare(r.name)),
      }))

    all.push({ name: 'Disabled', list: state.disabled })
    return all
  })

  const deleteSub = () => {
    const presetId = deleting()
    if (!presetId) return

    presetStore.deleteSubscription(presetId, () => nav('/admin/subscriptions'))
    setDeleting()
  }

  onMount(() => {
    presetStore.getSubscriptions()
    userStore.getTiers()
  })

  return (
    <Page>
      <PageHeader title="Subscriptions" />
      <A href="/admin/metrics" class="link">
        ← Back to Manage
      </A>
      <div class="mb-4 flex w-full justify-end gap-2">
        <A href="/admin/tiers/new">
          <Button>
            <Plus />
            Tier
          </Button>
        </A>
        <A href="/admin/subscriptions/new">
          <Button>
            <Plus />
            Model
          </Button>
        </A>
      </div>
      <div class="flex flex-col items-center gap-2">
        <Show when={cfg.tiers.length === 0}>
          <div class="flex justify-center text-xl font-bold">No Tiers</div>
        </Show>
        <Show when={cfg.tiers.length > 0}>
          <div class="flex justify-center text-xl font-bold">Tiers</div>
          <div class="flex w-full flex-col gap-2">
            <For each={cfg.tiers}>
              {(each) => (
                <div class="flex w-full gap-2">
                  <A href={`/admin/tiers/${each._id}`} class="w-full">
                    <SolidCard
                      bg={each.enabled ? 'bg-800' : 'rose-900'}
                      hover="bg-700"
                      class="w-full cursor-pointer"
                    >
                      {each.name}
                      <Show when={each.cost > 0 && !!each.priceId}>
                        <span class="text-600 ml-2 text-xs italic">Stripe: ${each.cost / 100}</span>
                      </Show>

                      <Show when={each.patreon?.cost! > 0}>
                        <span class="text-600 ml-2 text-xs italic">
                          Patreon: ${(each.patreon?.cost! / 100).toFixed(2)}
                        </span>
                      </Show>

                      <Show when={!each.enabled}>
                        <span class="text-600 ml-2 text-xs italic">disabled</span>
                      </Show>
                    </SolidCard>
                  </A>
                  <div class="flex min-w-fit gap-2">
                    <Show when={each.enabled}>
                      <Button
                        schema="green"
                        onClick={() => adminStore.updateTier(each._id, { enabled: false })}
                      >
                        Enabled
                      </Button>
                    </Show>
                    <Show when={!each.enabled}>
                      <Button
                        schema="red"
                        onClick={() => adminStore.updateTier(each._id, { enabled: true })}
                      >
                        Disabled
                      </Button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Divider />
        <div class="flex justify-center font-bold">Models</div>
        <For each={subCats()}>
          {(item) => (
            <>
              <div class="bold flex justify-start">{item.name}</div>
              <For each={item.list}>
                {(sub) => (
                  <div class="flex w-full items-center gap-2">
                    <A
                      href={`/admin/subscriptions/${sub._id}`}
                      class="flex h-12 w-full gap-2 rounded-xl hover:bg-[var(--bg-600)]"
                      classList={{
                        'bg-red-900': sub.subDisabled && !sub.isDefaultSub,
                        'text-500': sub.subDisabled && !sub.isDefaultSub,
                        'bg-800': !sub.subDisabled && !sub.isDefaultSub,
                        'bg-[var(--hl-800)]': sub.isDefaultSub,
                      }}
                    >
                      <div class="ml-4 flex w-full items-center">
                        <div class="flex gap-1">
                          <span class="mr-1 text-xs italic text-[var(--text-600)]">
                            [Level: {sub.subLevel}] {getServiceName(sub.service)}
                          </span>
                          {sub.name}
                          <Show when={sub.description}>
                            <span class="text-500 ml-1 text-xs">{sub.description}</span>
                          </Show>
                          <span class="mr-1 text-xs italic text-[var(--text-600)]">
                            {sub.isDefaultSub ? ' default' : ''}
                            {sub.subDisabled ? ' (disabled)' : ''}
                          </span>
                          <Contexts
                            levels={[
                              {
                                level: sub.subLevel,
                                maxContextLength: sub.maxContextLength!,
                                maxTokens: sub.maxTokens!,
                              },
                            ]}
                          />
                          <Contexts levels={sub.levels || []} />
                        </div>
                      </div>
                    </A>
                    <Button
                      schema="clear"
                      size="sm"
                      onClick={() => nav(`/admin/subscriptions/new?preset=${sub._id}`)}
                      class="icon-button"
                    >
                      <Copy />
                    </Button>
                    <Button
                      schema="clear"
                      size="sm"
                      onClick={() => setDeleting(sub._id)}
                      class="icon-button"
                    >
                      <Trash />
                    </Button>
                  </div>
                )}
              </For>
            </>
          )}
        </For>
      </div>
      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={deleteSub}
        message="Are you sure you wish to delete this subscription?"
      />
    </Page>
  )
}

export default SubscriptionList

const Contexts: Component<{ levels: SubscriptionModelLevel[] }> = (props) => {
  return (
    <>
      <For each={props.levels}>
        {(level) => (
          <Pill small>
            {level.level}. {level.maxContextLength} / {level.maxTokens}
          </Pill>
        )}
      </For>
    </>
  )
}
