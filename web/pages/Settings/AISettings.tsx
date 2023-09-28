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
import { SolidCard, TitleCard } from '/web/shared/Card'
import { PresetSelect } from '/web/shared/PresetSelect'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
  onHordeModelsChange: (models: string[]) => void
}> = (props) => {
  const [query] = useSearchParams()
  const state = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))

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
    return [{ label: 'None', value: '', custom: false }].concat(opts)
  })
  const [presetId, setPresetId] = createSignal(state.user?.defaultPreset || '')

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Show when={!ready()}>
        <div>Loading...</div>
      </Show>

      <Show when={ready()}>
        <PresetSelect
          fieldName="defaultPreset"
          label="Default Preset"
          helperText="The default preset your chats will use"
          options={presetOptions()}
          selected={presetId()}
          setPresetId={setPresetId}
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
          <SolidCard bg="orange-500" class="mb-2">
            Are you using an external AI service such as OpenAI, NovelAI, or Horde? Provide your API
            key below.
          </SolidCard>
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === ADAPTER_LABELS.horde ? tabClass : 'hidden'}>
        <HordeAISettings
          onHordeWorkersChange={props.onHordeWorkersChange}
          onHordeModelsChange={props.onHordeModelsChange}
        />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.kobold ? tabClass : 'hidden'}>
        <KoboldAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.ooba ? tabClass : 'hidden'}>
        <OobaAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.openai ? tabClass : 'hidden'}>
        <OpenAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.scale ? tabClass : 'hidden'}>
        <ScaleSettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.novel ? tabClass : 'hidden'}>
        <NovelAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS.claude ? tabClass : 'hidden'}>
        <ClaudeSettings />
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

            <RegisteredSettings service={each} />
          </div>
        )}
      </For>
    </>
  )
}

export default AISettings
