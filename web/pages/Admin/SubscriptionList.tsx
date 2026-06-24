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
  setComponentPageTitle('订阅与模型')
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

  const cfg = userStore((s) => ({ tiers: s.tiers }))

  const [deleting, setDeleting] = createSignal<string>()
  const subCats = createMemo(() => {
    const cats = new Map<number, Array<SubscriptionModel & { label: string }>>()

    for (const sub of state.enabled) {
      const levels = sub.levels || []
      let level = levels.reduce<number | null>(
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
        name: `层级 ${level}`,
        list: list.sort((l, r) => l.name.localeCompare(r.name)),
      }))

    all.push({ name: '已禁用', list: state.disabled })
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
      <PageHeader title="订阅与模型" />
      <A href="/admin/metrics" class="link">
        ← 返回管理后台
      </A>
      <div class="mb-4 flex w-full justify-end gap-2">
        <Button href="/admin/tiers/new">
          <Plus />
          层级
        </Button>

        <Button href="/admin/subscriptions/new">
          <Plus />
          模型
        </Button>
      </div>
      <div class="flex flex-col items-center gap-2">
        <Show when={cfg.tiers.length === 0}>
          <div class="flex justify-center text-xl font-bold">没有层级</div>
        </Show>
        <Show when={cfg.tiers.length > 0}>
          <div class="flex justify-center text-xl font-bold">层级</div>
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
                        <span class="text-600 ml-2 text-xs italic">已禁用</span>
                      </Show>
                    </SolidCard>
                  </A>
                  <div class="flex min-w-fit gap-2">
                    <Show when={each.enabled}>
                      <Button
                        schema="green"
                        onClick={() => adminStore.updateTier(each._id, { enabled: false })}
                      >
                        已启用
                      </Button>
                    </Show>
                    <Show when={!each.enabled}>
                      <Button
                        schema="red"
                        onClick={() => adminStore.updateTier(each._id, { enabled: true })}
                      >
                        已禁用
                      </Button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Divider />
        <div class="flex justify-center font-bold">模型</div>
        <For each={subCats()}>
          {(item) => (
            <>
              <div class="bold flex justify-start">{item.name}</div>
              <For each={item.list}>
                {(sub) => (
                  <div class="flex w-full items-center gap-2">
                    <A
                      href={`/admin/subscriptions/${sub._id}`}
                      class="flex h-12 w-full items-center gap-2 rounded-xl hover:bg-[var(--bg-600)]"
                      classList={{
                        'bg-red-900': sub.subDisabled && !sub.isDefaultSub,
                        'text-500': sub.subDisabled && !sub.isDefaultSub,
                        'bg-800': !sub.subDisabled && !sub.isDefaultSub,
                        'bg-[var(--hl-800)]': sub.isDefaultSub,
                      }}
                    >
                      <div class="ml-4 flex w-full items-center">
                        <div class="flex items-center gap-1">
                          <span class="mr-1 text-xs italic text-[var(--text-600)]">
                            <Pill small inverse type={sub.allowGuestUsage ? 'green' : 'premium'}>
                              {sub.subLevel}
                            </Pill>
                          </span>
                          <div class="flex flex-col gap-0">
                            <div>{sub.name}</div>
                            <div class="text-xs leading-3 text-[var(--text-600)]">
                              {sub.subModel}
                            </div>
                          </div>
                          <Show when={sub.description}>
                            <Pill small inverse type="hl">
                              {sub.description}
                            </Pill>
                          </Show>
                          <span class="mr-1 text-xs italic text-[var(--text-600)]">
                            <Show when={sub.isDefaultSub}>
                              <Pill inverse small>
                                默认
                              </Pill>
                            </Show>
                            <Show when={sub.subDisabled}>
                              <Pill inverse small type="rose">
                                已禁用
                              </Pill>
                            </Show>
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
        message="确定要删除这个订阅吗？"
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
