import { ADAPTER_LABELS } from '../../../common/adapters'
import { presetStore, settingStore, userStore } from '../../store'
import Tabs from '../../shared/Tabs'
import HordeAISettings from './components/HordeAISettings'
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from 'solid-js'
import OpenAISettings from './components/OpenAISettings'
import ScaleSettings from './components/ScaleSettings'
import NovelAISettings from './components/NovelAISettings'
import KoboldAISettings from './components/KoboldAISettings'
import OobaAISettings from './components/OobaAISettings'
import ClaudeSettings from './components/ClaudeSettings'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import RegisteredSettings from './components/RegisteredSettings'
import { useSearchParams } from '@solidjs/router'
import OpenRouterOauth from './OpenRouterOauth'
import { SolidCard, TitleCard } from '/web/shared/Card'
import { PresetSelect } from '/web/shared/PresetSelect'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { neat } from '/common/util'
import { HelpModal } from '/web/shared/Modal'
import { Toggle } from '/web/shared/Toggle'
import { AppSchema } from '/common/types/index'
import { SetStoreFunction } from 'solid-js/store'

const AISettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  const [query] = useSearchParams()
  const state = userStore()
  const cfg = settingStore((s) => ({
    config: s.config,
    server: s.config.serverConfig,
  }))
  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))
  const [apiKey, setApiKey] = createSignal(state.user?.apiKey || '')

  const revealKey = () => {
    userStore.revealApiKey((key) => {
      setApiKey(key)
    })
  }

  const generateKey = () => {
    userStore.generateApiKey((key) => {
      setApiKey(key)
    })
  }

  createEffect(() => {
    const tabs = cfg.config.adapters
      .filter((adp) => {
        if (adp === 'ooba') return false
        const reg = cfg.config.registered.find((r) => r.name === adp)
        if (!reg) return true
        for (const opt of reg.settings) {
          if (!opt.preset) return true
        }
        return false
      })
      .map((a) => ADAPTER_LABELS[a] || a)

    setTabs(tabs)

    if (!ready() && cfg.config.adapters?.length) {
      const queryTab = tabs.findIndex((label) => label.toLowerCase() === query.service)
      setTab(queryTab !== -1 ? queryTab : 0)
      setReady(true)
    }
  })

  const [tabs, setTabs] = createSignal<string[]>([])
  const [tab, setTab] = createSignal(-1)
  const [ready, setReady] = createSignal(false)

  const currentTab = createMemo(() => {
    const list = tabs()
    const next = list[tab()]
    return next
  })
  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter(
      (pre) => pre.value !== AutoPreset.chat && pre.value !== AutoPreset.service
    )
    return opts
  })

  const canUseApi = createMemo(() => {
    if (!cfg.server) return false
    if (!cfg.server.apiAccess || cfg.server?.apiAccess === 'off') return false
    if (!state.user?.admin) {
      if (cfg.server.apiAccess === 'users') return true
      return cfg.server.apiAccess === 'subscribers' && state.sub?.tier.apiAccess
    }

    return true
  })

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Show when={!ready()}>
        <div>Loading...</div>
      </Show>

      <Show when={ready()}>
        <Toggle
          value={!props.state.disableLTM}
          label="Enable Embeddings/Long-Term Memory"
          helperMarkdown={`Improves site performance when disabled. Disable long-term memory if your chat is _laggy_ and unresponsive.`}
          onChange={(ev) => props.setter('disableLTM', !ev)}
        />

        <Show when={!canUseApi()}>
          <PresetSelect
            label="Default Preset"
            helperText="The initially selected preset when creating a new chat. "
            options={presetOptions()}
            selected={props.state.defaultPreset}
            setPresetId={(ev) => props.setter('defaultPreset', ev)}
          />
        </Show>

        <Show when={canUseApi()}>
          <SolidCard class="flex flex-col gap-2">
            <HelpModal
              title="Agnaistic API Access"
              cta={
                <div>
                  <a class="link">How to use API Access</a>
                </div>
              }
              markdown={ApiAccessHelp}
            />

            <PresetSelect
              fieldName="defaultPreset"
              label="Default/API Access Preset"
              helperText="Preset used when using API access. Also the initially selected preset when creating a new chat."
              options={presetOptions()}
              selected={props.state.defaultPreset}
              setPresetId={(ev) => props.setter('defaultPreset', ev)}
            />

            <TextInput
              fieldName="apiKeyPlaceholder"
              helperText={
                <div class="text-900 flex gap-1">
                  <Show when={apiKey().includes('***')}>
                    <Button size="pill" onClick={revealKey}>
                      Reveal Key
                    </Button>
                  </Show>
                  <Show when={apiKey() === 'Not set'}>
                    <Button size="pill" onClick={generateKey}>
                      Generate Key
                    </Button>
                  </Show>
                  <Show when={apiKey() !== 'Not set'}>
                    <Button size="pill" onClick={generateKey}>
                      Regenerate Key
                    </Button>
                  </Show>
                </div>
              }
              label="API Key"
              readonly
              placeholder="API Key Hidden"
              value={apiKey()}
            />
          </SolidCard>
        </Show>

        <div class="my-2">
          <SolidCard bg="orange-500" class="mb-2">
            Are you using an external AI service such as OpenAI, NovelAI, or Horde? Provide your API
            key below.
          </SolidCard>
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === ADAPTER_LABELS.horde ? tabClass : 'hidden'}>
        <HordeAISettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.kobold ? tabClass : 'hidden'}>
        <KoboldAISettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.ooba ? tabClass : 'hidden'}>
        <OobaAISettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.openai ? tabClass : 'hidden'}>
        <OpenAISettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.scale ? tabClass : 'hidden'}>
        <ScaleSettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.novel ? tabClass : 'hidden'}>
        <NovelAISettings state={props.state} setter={props.setter} />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.claude ? tabClass : 'hidden'}>
        <ClaudeSettings state={props.state} setter={props.setter} />
      </div>

      <For each={cfg.config.registered}>
        {(each) => (
          <div class={currentTab() === ADAPTER_LABELS[each.name] ? tabClass : 'hidden'}>
            {/** Optionally show adapter specific information for registered adapters */}
            <Switch>
              <Match when={each.name === 'openrouter'}>
                <OpenRouterOauth />
              </Match>

              <Match when={each.name === 'replicate'}>
                <TitleCard>
                  Head to{' '}
                  <a class="link" target="_blank" href="https://replicate.com/">
                    Replicate.com
                  </a>{' '}
                  to get started.
                </TitleCard>
              </Match>
            </Switch>

            <RegisteredSettings service={each} state={props.state} setter={props.setter} />
          </div>
        )}
      </For>
    </>
  )
}

export default AISettings

const ApiAccessHelp = neat`
  The subscriber API endpoint uses the *OpenAI Text Completion* or *OpenAI Chat Completion* format.

  The full URL for these endpoints are:
  - https://api.agnai.chat/v1/completions
  - https://api.agnai.chat/v1/chat/completions

  **Instructions**:
  1. Select your \`API Access Preset\`: This preset will be used for your API calls. Change this on your settings page.
  2. Generate your API Key.
  3. Use the API URL \`https://api.agnai.chat\` and your generated API key.
`
