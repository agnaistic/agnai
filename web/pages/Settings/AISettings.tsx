import TextInput from '../../shared/TextInput'
import { adaptersToOptions } from '../../shared/util'
import Select from '../../shared/Select'
import {
  ADAPTER_LABELS,
} from '../../../common/adapters'
import { settingStore, userStore } from '../../store'
import Tabs from '../../shared/Tabs'
import { AIPreset } from './components/AIPreset'
import HordeAISettings from './components/HordeAISettings'
import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import OpenAISettings from './components/OpenAISettings'
import ScaleSettings from './components/ScaleSettings'
import NovelAISettings from './components/NovelAISettings'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
}> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    setTabs(cfg.config.adapters.map(a => ADAPTER_LABELS[a] || a))
    if(!ready() && cfg.config.adapters?.length) {
      var defaultTab = (cfg.config.adapters as (string | undefined)[]).indexOf(state.user?.defaultAdapter)
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
        <TextInput
          fieldName="koboldUrl"
          label="Kobold Compatible URL"
          helperText="Fully qualified URL. This URL must be publicly accessible."
          placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
          value={state.user?.koboldUrl}
        />
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
        <TextInput
          fieldName="luminaiUrl"
          label="LuminAI URL"
          helperText="Fully qualified URL. This URL must be publicly accessible."
          placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
          value={state.user?.luminaiUrl}
        />
      </div>
    </>
  )
}

export default AISettings