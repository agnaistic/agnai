import Select from '../../shared/Select'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { presetStore, settingStore, userStore } from '../../store'
import Tabs from '../../shared/Tabs'
import HordeAISettings from './components/HordeAISettings'
import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import OpenAISettings from './components/OpenAISettings'
import ScaleSettings from './components/ScaleSettings'
import NovelAISettings from './components/NovelAISettings'
import LuminAISettings from './components/LuminAISettings'
import KoboldAISettings from './components/KoboldAISettings'
import OobaAISettings from './components/OobaAISettings'
import ClaudeSettings from './components/ClaudeSettings'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
}> = (props) => {
  const state = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))

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
  const presetOptions = createMemo(() =>
    [{ label: 'None', value: '' }].concat(
      getPresetOptions(presets).filter(
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

        <div class="my-2">
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === 'horde' ? tabClass : 'hidden'}>
        <HordeAISettings onHordeWorkersChange={props.onHordeWorkersChange} />
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

      <div class={currentTab() === 'luminai' ? tabClass : 'hidden'}>
        <LuminAISettings />
      </div>

      <div class={currentTab() === 'claude' ? tabClass : 'hidden'}>
        <ClaudeSettings />
      </div>
    </>
  )
}

export default AISettings
