import Button from '../../shared/Button'
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

  const novelVerified = createMemo(
    () => (state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

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
        <TextInput
          fieldName="oaiKey"
          label="OpenAI Key"
          helperText="Valid OpenAI Key."
          placeholder={
            state.user?.oaiKeySet
              ? 'OpenAI key is set'
              : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          }
          type="password"
          value={state.user?.oaiKey}
        />
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
          Delete OpenAI Key
        </Button>
      </div>

      <div class={currentTab() === 'scale' ? tabClass : 'hidden'}>
        <AIPreset adapter="scale" />
        <TextInput
          fieldName="scaleUrl"
          label="Scale URL"
          helperText="Fully qualified Scale URL."
          placeholder={'E.g. https://dashboard.scale.com/spellbook/api/v2/deploy/a1b2c3'}
          value={state.user?.scaleUrl}
        />
        <TextInput
          fieldName="scaleApiKey"
          label="Scale API Key"
          placeholder={
            state.user?.scaleApiKeySet
              ? 'Scale API key is set'
              : 'E.g. 9rv440nv7ogj6s7j312flqijd'
          }
          type="password"
          value={state.user?.scaleApiKey}
        />
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('scale')}>
          Delete Scale API Key
        </Button>
      </div>

      <div class={currentTab() === 'novel' ? tabClass : 'hidden'}>
        <AIPreset adapter="novel" />
        <Select
          fieldName="novelModel"
          label="NovelAI Model"
          items={[
            { label: 'Euterpe', value: 'euterpe-v2' },
            { label: 'Krake', value: 'krake-v2' },
          ]}
          value={state.user?.novelModel}
        />
        <TextInput
          fieldName="novelApiKey"
          label="Novel API Key"
          type="password"
          value={state.user?.novelApiKey}
          helperText={
            <>
              NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization.
              Please note that this token expires periodically. You will occasionally need to
              re-enter this token. headers.{' '}
              <a
                class="link"
                target="_blank"
                href="https://github.com/luminai-companion/agn-ai/blob/dev/instructions/novel.md"
              >
                Instructions
              </a>
              .
            </>
          }
          placeholder={novelVerified()}
        />
        <Show when={state.user?.novelVerified}>
          <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('novel')}>
            Delete Novel API Key
          </Button>
        </Show>
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