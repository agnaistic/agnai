import Select from '../../shared/Select'
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
import { A, useSearchParams } from '@solidjs/router'
import { Toggle } from '/web/shared/Toggle'
import OpenRouterOauth from './OpenRouterOauth'
import { TitleCard } from '/web/shared/Card'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
  onHordeModelsChange: (models: string[]) => void
}> = (props) => {
  const [query] = useSearchParams()
  const state = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))

  createEffect(() => {
    const tabs = cfg.config.adapters.map((a) => ADAPTER_LABELS[a] || a)
    setTabs(tabs)

    if (!ready() && cfg.config.adapters?.length) {
      const queryTab = tabs.findIndex((label) => label.toLowerCase() === query.service)
      const defaultTab = cfg.config.adapters.indexOf(state.user?.defaultAdapter!)
      setTab(queryTab !== -1 ? queryTab : defaultTab === -1 ? 0 : defaultTab)
      setReady(true)
    }
  })

  const [tabs, setTabs] = createSignal<string[]>([])
  const [tab, setTab] = createSignal(-1)
  const [ready, setReady] = createSignal(false)

  const currentTab = createMemo(() => cfg.config.adapters[tab()])
  const presetOptions = createMemo(() =>
    [{ label: 'None', value: '' }].concat(
      getPresetOptions(presets, { builtin: true }).filter(
        (pre) => pre.value !== AutoPreset.chat && pre.value !== AutoPreset.service
      )
    )
  )

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Show when={!ready()}>
        <div>Loading...</div>
      </Show>

      <Show when={ready()}>
        <Select
          fieldName="defaultPreset"
          items={presetOptions()}
          label="Default Preset"
          helperText="The default preset your chats will use. If your preset is not in this list, it needs to be assigned an AI SERVICE."
          value={state.user?.defaultPreset || ''}
        />

        <Toggle
          fieldName="useLocalPipeline"
          label="Use Local Pipeline"
          helperText={
            <>
              <A class="link" href="/guides/pipeline">
                Pipeline Guide.
              </A>
              &nbsp;If available, use local Agnaistic pipeline features (summarization for images).
              This is extremely new and experimental. Expect this to change and improve in the near
              future.
              <span></span>
            </>
          }
          value={state.user?.useLocalPipeline}
        />

        <div class="my-2">
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === 'horde' ? tabClass : 'hidden'}>
        <HordeAISettings
          onHordeWorkersChange={props.onHordeWorkersChange}
          onHordeModelsChange={props.onHordeModelsChange}
        />
      </div>

      <div class={currentTab() === 'kobold' ? tabClass : 'hidden'}>
        <KoboldAISettings />
      </div>

      <div class={currentTab() === 'ooba' ? tabClass : 'hidden'}>
        <OobaAISettings />
      </div>

      <div class={currentTab() === 'openai' ? tabClass : 'hidden'}>
        <OpenAISettings />
      </div>

      <div class={currentTab() === 'scale' ? tabClass : 'hidden'}>
        <ScaleSettings />
      </div>

      <div class={currentTab() === 'novel' ? tabClass : 'hidden'}>
        <NovelAISettings />
      </div>

      <div class={currentTab() === 'claude' ? tabClass : 'hidden'}>
        <ClaudeSettings />
      </div>

      <For each={cfg.config.registered}>
        {(each) => (
          <div class={currentTab() === each.name ? tabClass : 'hidden'}>
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

            <RegisteredSettings service={each} />
          </div>
        )}
      </For>
    </>
  )
}

export default AISettings
