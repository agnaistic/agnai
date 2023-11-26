import { A, useNavigate } from '@solidjs/router'
import { Copy, Plus, Trash } from 'lucide-solid'
import { Component, createSignal, For, onMount, Show } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { adminStore, presetStore, userStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'
import { getServiceName, sortByLabel } from '/web/shared/adapter'
import Divider from '/web/shared/Divider'
import { SolidCard } from '/web/shared/Card'

const SubscriptionList: Component = () => {
  setComponentPageTitle('Subscriptions')
  const nav = useNavigate()
  const state = presetStore((s) => ({
    subs: s.subs
      .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
      .sort(sortByLabel),
  }))

  const cfg = userStore()

  const [deleting, setDeleting] = createSignal<string>()

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
    <>
      <PageHeader title="Subscriptions" />
      <A href="/admin/metrics" class="link">
        ← Back to Manage
      </A>
      <div class="mb-4 flex w-full justify-end gap-2">
        <A href="/admin/tiers/new">
          <Button>
            <Plus />
            Subscription Tier
          </Button>
        </A>
        <A href="/admin/subscriptions/new">
          <Button>
            <Plus />
            Subscription Preset
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
        <div class="flex justify-center font-bold">Subscription Presets</div>
        <For each={state.subs}>
          {(sub) => (
            <div class="flex w-full items-center gap-2">
              <A
                href={`/admin/subscriptions/${sub._id}`}
                class="flex h-12 w-full gap-2 rounded-xl hover:bg-[var(--bg-600)]"
                classList={{
                  'bg-500': sub.subDisabled && !sub.isDefaultSub,
                  'text-500': sub.subDisabled && !sub.isDefaultSub,
                  'bg-800': !sub.subDisabled && !sub.isDefaultSub,
                  'bg-[var(--hl-800)]': sub.isDefaultSub,
                }}
              >
                <div class="ml-4 flex w-full items-center">
                  <div>
                    <span class="mr-1 text-xs italic text-[var(--text-600)]">
                      [Level: {sub.subLevel}] {getServiceName(sub.service)}
                    </span>
                    {sub.name}
                    <span class="mr-1 text-xs italic text-[var(--text-600)]">
                      {sub.isDefaultSub ? ' default' : ''}
                      {sub.subDisabled ? ' (disabled)' : ''}
                    </span>
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
      </div>
      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={deleteSub}
        message="Are you sure you wish to delete this subscription?"
      />
    </>
  )
}

export default SubscriptionList
