import { Component, createMemo, createSignal } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { getFormEntries, getStrictForm } from '../../shared/util'
import { CHAT_ADAPTERS, ChatAdapter, AIAdapter } from '../../../common/adapters'
import { userStore } from '../../store'
import { AppSchema } from '../../../srv/db/schema'
import UISettings from './UISettings'
import Tabs from '../../shared/Tabs'
import AISettings from './AISettings'
import { Show } from 'solid-js'

const settingTabs = {
  ai: 'AI Settings',
  ui: 'UI Settings',
  guest: 'Guest Data',
}

type Tab = keyof typeof settingTabs

type DefaultAdapter = Exclude<ChatAdapter, 'default'>

const adapterOptions = CHAT_ADAPTERS.filter((adp) => adp !== 'default') as DefaultAdapter[]

const Settings: Component = () => {
  const state = userStore()

  const [tab, setTab] = createSignal(0)
  const [workers, setWorkers] = createSignal<string[]>(state.user?.hordeWorkers || [])

  const tabs: Tab[] = ['ai', 'ui']
  if (!state.loggedIn) tabs.push('guest')
  const currentTab = createMemo(() => tabs[tab()])

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string?',
      novelApiKey: 'string?',
      novelModel: 'string?',
      hordeKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      oaiKey: 'string?',
      scaleApiKey: 'string?',
      scaleUrl: 'string?',
      claudeApiKey: 'string?',
      defaultAdapter: adapterOptions,
    } as const)

    const defaultPresets = getFormEntries(evt)
      .filter(([name]) => name.startsWith('preset.'))
      .map(([name, value]) => {
        return { adapter: name.replace('preset.', '') as AIAdapter, presetId: value }
      })
      .reduce((prev, curr) => {
        prev![curr.adapter] = curr.presetId
        return prev
      }, {} as AppSchema.User['defaultPresets'])

    userStore.updateConfig({
      ...body,
      hordeWorkers: workers(),
      defaultPresets,
    })
  }

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" noDivider />
      <div class="my-2">
        <Tabs tabs={tabs.map((t) => settingTabs[t])} selected={tab} select={setTab} />
      </div>
      <form onSubmit={onSubmit} autocomplete="off">
        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'ai' ? tabClass : 'hidden'}>
            <AISettings onHordeWorkersChange={setWorkers} />
          </div>

          <div class={currentTab() === 'ui' ? tabClass : 'hidden'}>
            <UISettings />
          </div>

          <div class={currentTab() === 'guest' ? tabClass : 'hidden'}>
            <div class="mt-8 mb-4 flex w-full flex-col items-center justify-center">
              <div>This cannot be undone!</div>
              <Button class="bg-red-600" onClick={userStore.clearGuestState}>
                <AlertTriangle /> Delete Guest State <AlertTriangle />
              </Button>
            </div>
          </div>
        </div>

        <Show when={currentTab() !== 'guest'}>
          <div class="flex justify-end gap-2 pt-4">
            <Button type="submit">
              <Save />
              Update Settings
            </Button>
          </div>
        </Show>
      </form>
    </>
  )
}

export default Settings
