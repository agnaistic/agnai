import { Component, createMemo, createSignal } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { getFormEntries, getStrictForm, setComponentPageTitle } from '../../shared/util'
import { CHAT_ADAPTERS, ChatAdapter, AIAdapter } from '../../../common/adapters'
import { userStore } from '../../store'
import { AppSchema } from '../../../srv/db/schema'
import UISettings from './UISettings'
import Tabs from '../../shared/Tabs'
import AISettings from './AISettings'
import { Show } from 'solid-js'
import { ImageSettings } from './Image/ImageSettings'

const settingTabs = {
  ai: 'AI Settings',
  ui: 'UI Settings',
  image: 'Image Settings',
  guest: 'Guest Data',
}

type Tab = keyof typeof settingTabs

type DefaultAdapter = Exclude<ChatAdapter, 'default'>

const adapterOptions = CHAT_ADAPTERS.filter((adp) => adp !== 'default') as DefaultAdapter[]

const Settings: Component = () => {
  setComponentPageTitle('Settings')
  const state = userStore()

  const [tab, setTab] = createSignal(0)
  const [workers, setWorkers] = createSignal<string[]>(state.user?.hordeWorkers || [])

  const tabs: Tab[] = ['ai', 'ui', 'image']
  if (!state.loggedIn) tabs.push('guest')
  const currentTab = createMemo(() => tabs[tab()])

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string?',
      thirdPartyFormat: ['kobold', 'openai', 'claude'],
      novelApiKey: 'string?',
      novelModel: 'string?',
      hordeUseTrusted: 'boolean?',
      hordeKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      oaiKey: 'string?',
      scaleApiKey: 'string?',
      scaleUrl: 'string?',
      claudeApiKey: 'string?',
      defaultAdapter: adapterOptions,

      imageType: ['horde', 'sd', 'novel'],
      imageSteps: 'number',
      imageCfg: 'number',
      imageWidth: 'number',
      imageHeight: 'number',

      novelImageModel: 'string',
      novelSampler: 'string',

      hordeSampler: 'string',
      hordeImageModel: 'string',

      sdUrl: 'string',
      sdSampler: 'string',
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

    const {
      imageCfg,
      imageHeight,
      imageSteps,
      imageType,
      imageWidth,
      sdSampler,
      sdUrl,
      hordeImageModel,
      hordeSampler,
      novelImageModel,
      novelSampler,
      ...base
    } = body

    userStore.updateConfig({
      ...base,
      hordeWorkers: workers(),
      defaultPresets,
      images: {
        type: imageType,
        cfg: imageCfg,
        height: imageHeight,
        width: imageWidth,
        steps: imageSteps,
        horde: {
          sampler: hordeSampler,
          model: hordeImageModel,
        },
        novel: {
          model: novelImageModel,
          sampler: novelSampler,
        },
        sd: {
          sampler: sdSampler,
          url: sdUrl,
        },
      },
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

          <div class={currentTab() === 'image' ? tabClass : 'hidden'}>
            <ImageSettings />
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
