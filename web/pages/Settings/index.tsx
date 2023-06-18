import { Component, createMemo, createSignal } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import {
  applyDotProperty,
  getFormEntries,
  getStrictForm,
  setComponentPageTitle,
} from '../../shared/util'
import { userStore } from '../../store'
import UISettings from './UISettings'
import Tabs from '../../shared/Tabs'
import AISettings from './AISettings'
import { Show } from 'solid-js'
import { ImageSettings } from './Image/ImageSettings'
import { VoiceSettings } from './Voice/VoiceSettings'
import { toArray } from '/common/util'
import { useSearchParams } from '@solidjs/router'

const settingTabs: Record<Tab, string> = {
  ai: 'AI Settings',
  ui: 'UI Settings',
  image: 'Image Settings',
  voice: 'Voice Settings',
  guest: 'Guest Data',
}

enum MainTab {
  ai = 0,
  ui = 1,
  image = 2,
  voice = 3,
  guest = 4,
}

type Tab = keyof typeof MainTab

const Settings: Component = () => {
  setComponentPageTitle('Settings')
  const state = userStore()
  const [query, _setQuery] = useSearchParams()
  const [tab, setTab] = createSignal<number>(MainTab[query.tab as Tab] ?? 0)
  const [workers, setWorkers] = createSignal<string[]>(toArray(state.user?.hordeWorkers))
  const [models, setModels] = createSignal<string[]>(toArray(state.user?.hordeModel))

  const tabs: Tab[] = ['ai', 'ui', 'image', 'voice']
  if (!state.loggedIn) tabs.push('guest')

  const currentTab = createMemo(() => tabs[tab()])

  const onSubmit = (evt: Event) => {
    const adapterConfig = getAdapterConfig(getFormEntries(evt))
    const body = getStrictForm(evt, settingsForm)

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

      speechToTextEnabled,
      speechToTextAutoSubmit,
      speechToTextAutoRecord,

      textToSpeechEnabled,
      textToSpeechFilterActions,

      elevenLabsApiKey,

      summariseChat,
      summaryPrompt,

      ...base
    } = body

    userStore.updateConfig({
      ...base,
      adapterConfig,
      hordeWorkers: workers(),
      hordeModels: models(),
      speechtotext: {
        enabled: speechToTextEnabled,
        autoSubmit: speechToTextAutoSubmit,
        autoRecord: speechToTextAutoRecord,
      },
      elevenLabsApiKey,
      texttospeech: {
        enabled: textToSpeechEnabled,
        filterActions: textToSpeechFilterActions,
      },
      images: {
        type: imageType,
        cfg: imageCfg,
        height: imageHeight,
        width: imageWidth,
        steps: imageSteps,
        summariseChat,
        summaryPrompt,
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
            <AISettings onHordeWorkersChange={setWorkers} onHordeModelsChange={setModels} />
          </div>

          <div class={currentTab() === 'ui' ? tabClass : 'hidden'}>
            <UISettings />
          </div>

          <div class={currentTab() === 'image' ? tabClass : 'hidden'}>
            <ImageSettings />
          </div>

          <div class={currentTab() === 'voice' ? tabClass : 'hidden'}>
            <VoiceSettings />
          </div>

          <div class={currentTab() === 'guest' ? tabClass : 'hidden'}>
            <div class="mt-8 mb-4 flex w-full flex-col items-center justify-center">
              <div>This cannot be undone!</div>
              <Button schema="red" onClick={userStore.clearGuestState}>
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

const settingsForm = {
  defaultPreset: 'string?',
  koboldUrl: 'string?',
  thirdPartyFormat: ['kobold', 'openai', 'claude'],
  oobaUrl: 'string?',
  thirdPartyPassword: 'string?',
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
  logPromptsToBrowserConsole: 'boolean?',

  summariseChat: 'boolean?',
  summaryPrompt: 'string?',
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

  speechToTextEnabled: 'boolean',
  speechToTextAutoSubmit: 'boolean',
  speechToTextAutoRecord: 'boolean',

  textToSpeechEnabled: 'boolean',
  textToSpeechFilterActions: 'boolean',

  elevenLabsApiKey: 'string?',
} as const

function getAdapterConfig(entries: Array<[string, any]>) {
  let obj: any = {}

  for (const [prop, value] of entries) {
    if (!prop.startsWith('adapterConfig.')) continue
    applyDotProperty(obj, prop.replace('adapterConfig.', ''), value)
    // const name = prop.replace('adapterConfig.', '')
    // obj[name] = value
  }

  return obj
}
