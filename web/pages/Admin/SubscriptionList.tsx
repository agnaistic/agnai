import { A, useNavigate } from '@solidjs/router'
import { Copy, Plus, Trash } from 'lucide-solid'
import { Component, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { presetStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'
import { getServiceName, sortByLabel } from '/web/shared/adapter'

const SubscriptionList: Component = () => {
  setComponentPageTitle('Subscriptions')
  const nav = useNavigate()
  const state = presetStore((s) => ({
    subs: s.subs
      .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
      .sort(sortByLabel),
  }))

  const [deleting, setDeleting] = createSignal<string>()

  const deleteSub = () => {
    const presetId = deleting()
    if (!presetId) return

    presetStore.deletePreset(presetId, () => nav('/admin/subscriptions'))
    setDeleting()
  }

  onMount(() => {
    presetStore.getSubscriptions()
  })

  return (
    <>
      <PageHeader title="Subscription Presets" />
      <div class="mb-4 flex w-full justify-end">
        <A href="/admin/subscriptions/new">
          <Button>
            <Plus />
            New Subscription
          </Button>
        </A>
      </div>

      <div class="flex flex-col items-center gap-2">
        <For each={state.subs}>
          {(sub) => (
            <div class="flex w-full items-center gap-2">
              <A
                href={`/admin/subscriptions/${sub._id}`}
                class="flex h-12 w-full gap-2 rounded-xl hover:bg-[var(--bg-600)]"
                classList={{ 'bg-900': sub.subDisabled, 'bg-800': !sub.subDisabled }}
              >
                <div class="ml-4 flex w-full items-center">
                  <div>
                    <span class="mr-1 text-xs italic text-[var(--text-600)]">
                      Tier {sub.subLevel}. {getServiceName(sub.service)}
                    </span>
                    {sub.name}
                    {sub.subDisabled ? ' (disabled)' : ''}
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
