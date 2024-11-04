import { Component, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { settingStore, userStore } from '../../store'
import UISettings from './UISettings'
import Tabs from '../../shared/Tabs'
import AISettings from './AISettings'
import { Show } from 'solid-js'
import { VoiceSettings } from './Voice/VoiceSettings'
import { useSearchParams } from '@solidjs/router'
import { RootModal } from '/web/shared/Modal'
import { SubscriptionPage } from '../Profile/SubscriptionPage'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

const settingTabs: Record<Tab, string> = {
  ai: 'AI Settings',
  ui: 'UI Settings',
  voice: 'Voice Settings',
  guest: 'Guest Data',
  subscription: 'Subscription',
}

enum MainTab {
  ai = 0,
  ui = 1,
  voice = 2,
  guest = 3,
  subscription = 4,
}

type Tab = keyof typeof MainTab

export const SettingsModal = () => {
  const state = settingStore()
  const [footer, setFooter] = createSignal<any>()
  return (
    <RootModal
      show={state.showSettings}
      close={() => settingStore.modal(false)}
      fixedHeight
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={() => settingStore.modal(false)}>
            Close
          </Button>
          {footer()}
        </>
      }
    >
      <Settings footer={setFooter} />
    </RootModal>
  )
}

const Settings: Component<{ footer?: (children: any) => void }> = (props) => {
  setComponentPageTitle('Settings')
  const user = userStore()

  const [query, setQuery] = useSearchParams()
  const [tab, setTab] = createSignal<number>(+(query.tab ?? '0'))

  const [store, setStore] = createStore(user.user!)

  createEffect(
    on(
      () => user.user,
      (next) => {
        if (!next) return
        setStore(next)
      }
    )
  )

  onMount(() => {
    if (!query.tab) {
      setQuery({ tab: tab() })
    }
  })

  const tabs: Tab[] = ['ai', 'ui', 'voice']

  if (user.tiers.length > 0 || user.user?.billing) {
    tabs.push('subscription')
  }

  if (!user.loggedIn) tabs.push('guest')

  const currentTab = createMemo(() => tabs[tab()])

  const onSubmit = () => {
    userStore.updateConfig(store)
  }

  const tabClass = `flex flex-col gap-4`

  const version = (window.agnai_version?.includes('unknown') ? '' : window.agnai_version).slice(
    0,
    7
  )

  onMount(() => {
    props.footer?.(footer)
  })

  const footer = (
    <Button onClick={onSubmit}>
      <Save />
      Update Settings
    </Button>
  )

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle={
          <Show when={!!version}>
            <em>v.{version}</em>
          </Show>
        }
        noDivider
      />

      <div class="my-2">
        <Tabs
          tabs={tabs.map((t) => settingTabs[t])}
          selected={tab}
          select={(id) => {
            setTab(id)
            setQuery({ tab: id })
          }}
        />
      </div>
      <form autocomplete="off">
        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'ai' ? tabClass : 'hidden'}>
            <AISettings state={store} setter={setStore} />
          </div>

          <div class={currentTab() === 'ui' ? tabClass : 'hidden'}>
            <UISettings />
          </div>

          <div class={currentTab() === 'voice' ? tabClass : 'hidden'}>
            <VoiceSettings state={store} setter={setStore} />
          </div>

          <div class={currentTab() === 'subscription' ? tabClass : 'hidden'}>
            <SubscriptionPage />
          </div>

          <div class={currentTab() === 'guest' ? tabClass : 'hidden'}>
            <div class="mb-4 mt-8 flex w-full flex-col items-center justify-center">
              <div>This cannot be undone!</div>
              <Button schema="red" onClick={userStore.clearGuestState}>
                <AlertTriangle /> Delete Guest State <AlertTriangle />
              </Button>
            </div>
          </div>
        </div>

        <Show when={!props.footer}>
          <div class="flex justify-end gap-2 pt-4">{footer}</div>
        </Show>
      </form>
    </Page>
  )
}

export default Settings
