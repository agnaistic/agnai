import { adaptersToOptions } from '../../shared/util'
import Select from '../../shared/Select'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { settingStore, userStore } from '../../store'
import Tabs from '../../shared/Tabs'
import { AIPreset } from './components/AIPreset'
import HordeAISettings from './components/HordeAISettings'
import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import OpenAISettings from './components/OpenAISettings'
import ScaleSettings from './components/ScaleSettings'
import NovelAISettings from './components/NovelAISettings'
import LuminAISettings from './components/LuminAISettings'
import KoboldAISettings from './components/KoboldAISettings'
import OobaAISettings from './components/OobaAISettings'
import ChaiSettings from './components/ChaiSettings'
import ClaudeSettings from './components/ClaudeSettings'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
}> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    setTabs(cfg.config.adapters.map((a) => ADAPTER_LABELS[a] || a))
    if (!ready() && cfg.config.adapters?.length) {
      var defaultTab = (cfg.config.adapters as (string | undefined)[]).indexOf(
        state.user?.defaultAdapter
      )
      setTab(defaultTab == -1 ? 0 : defaultTab)
      setReady(true)
    }
  })

  const [tabs, setTabs] = createSignal<string[]>([])
  const [tab, setTab] = createSignal(-1)
  const [ready, setReady] = createSignal(false)

  const currentTab = createMemo(() => cfg.config.adapters[tab()])

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Show when={!ready()}>
        <div>Loading...</div>
      </Show>

      <Show when={ready()}>
        <Select
          fieldName="defaultAdapter"
          label="Default AI Service"
          items={adaptersToOptions(cfg.config.adapters)}
          helperText="The default service conversations will use unless otherwise configured"
          value={state.user?.defaultAdapter}
        />

        <div class="my-2">
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === 'horde' ? tabClass : 'hidden'}>
        <AIPreset adapter="horde" />
        <HordeAISettings onHordeWorkersChange={props.onHordeWorkersChange} />
      </div>

      <div class={currentTab() === 'kobold' ? tabClass : 'hidden'}>
        <AIPreset adapter="kobold" />
        <KoboldAISettings />
      </div>

      <div class={currentTab() === 'ooba' ? tabClass : 'hidden'}>
        <AIPreset adapter="ooba" />
        <OobaAISettings />
      </div>

      <div class={currentTab() === 'openai' ? tabClass : 'hidden'}>
        <AIPreset adapter="openai" />
        <OpenAISettings />
      </div>

      <div class={currentTab() === 'scale' ? tabClass : 'hidden'}>
        <AIPreset adapter="scale" />
        <ScaleSettings />
      </div>

      <div class={currentTab() === 'novel' ? tabClass : 'hidden'}>
        <AIPreset adapter="novel" />
        <NovelAISettings />
      </div>

      <div class={currentTab() === 'luminai' ? tabClass : 'hidden'}>
        <AIPreset adapter="luminai" />
        <LuminAISettings />
      </div>

      <div class={currentTab() === 'chai' ? tabClass : 'hidden'}>
        <AIPreset adapter="chai" />
        <ChaiSettings />
      </div>

      <div class={currentTab() === 'claude' ? tabClass : 'hidden'}>
        <AIPreset adapter="claude" />
        <ClaudeSettings />
      </div>
    </>
  )
}

export default AISettings
