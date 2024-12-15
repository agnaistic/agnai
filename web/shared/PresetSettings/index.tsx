import { Component, createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js'
import Select, { Option } from '../Select'
import {
  ADAPTER_LABELS,
  AIAdapter,
  AdapterSetting,
  ThirdPartyFormat,
} from '../../../common/adapters'
import { presetStore, settingStore } from '../../store'
import { Card } from '../Card'
import { getUsableServices, storage } from '../util'
import { createStore } from 'solid-js/store'
import Accordian from '../Accordian'
import { ServiceOption } from '../../pages/Settings/components/RegisteredSettings'
import { getServiceTempConfig } from '../adapter'
import Tabs from '../Tabs'
import { useSearchParams } from '@solidjs/router'
import { AgnaisticSettings } from './Agnaistic'
import { usePaneManager } from '../hooks'
import { HideState, PresetProps, PresetState, PresetTab, SetPresetState } from './types'
import { GeneralSettings } from './General'
import { RegisteredSettings } from './Registered'
import { PromptSettings } from './Prompt'
import { SliderSettings } from './Sliders'
import { ToggleSettings } from './Toggles'
import { MemorySettings } from './Memory'
import { PresetMode } from './Fields'

export { PresetSettings as default }

type TempSetting = AdapterSetting & { value: any }

const PresetSettings: Component<
  PresetProps & { noSave: boolean; store: PresetState; setter: SetPresetState; hides: HideState }
> = (props) => {
  const settings = settingStore()
  const pane = usePaneManager()
  const [search, setSearch] = useSearchParams()
  const [tab, setTab] = createSignal(+(search.preset_tab ?? '0'))

  const services = createMemo<Option[]>(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return list
  })

  createEffect(
    on(
      () => (props.store.service || '') + services().length,
      () => {
        if (props.disabled) return
        if (props.store.service) return
        if (!services().length) return
        if (props.store._id) return

        props.setter('service', services()[0].value as any)
      }
    )
  )

  const sub = createMemo(() => {
    if (props.store.service !== 'agnaistic') return
    const match = settings.config.subs.find(
      (sub) => sub._id === props.store.registered?.agnaistic?.subscriptionId
    )

    return match
  })

  const tabs = createMemo(() => {
    if (!props.hideTabs && props.store.presetMode === 'simple') {
      return ['General', 'Prompt']
    }

    const list: PresetTab[] = ['General', 'Prompt', 'Memory', 'Samplers', 'Toggles']
    if (!props.hideTabs) return list

    return list.filter((tab) => !props.hideTabs!.includes(tab))
  })
  const tabName = createMemo(() => tabs()[tab()])

  onMount(() => presetStore.getTemplates())

  return (
    <div class="flex flex-col gap-4">
      <Card class="flex flex-col gap-2">
        <Select
          fieldName="service"
          label="AI Service"
          helperText={
            <>
              <Show when={!props.store.service}>
                <p class="text-red-500">
                  Warning! Your preset does not currently have a service set.
                </p>
              </Show>
            </>
          }
          value={props.store.service}
          items={services()}
          onChange={(ev) => props.setter('service', ev.value as any)}
          disabled={props.disabled || props.disableService}
        />

        <AgnaisticSettings
          state={props.store}
          hides={props.hides}
          setter={props.setter}
          noSave={props.noSave}
          sub={sub()}
        />

        <Select
          fieldName="thirdPartyFormat"
          label="Self-host / 3rd-party Format"
          helperText="Re-formats the prompt to the desired output format."
          items={[
            { label: 'None', value: '' },
            { label: 'Kobold', value: 'kobold' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'OpenAI (Chat Format)', value: 'openai-chat' },
            { label: 'OpenAI (Chat w/ Template)', value: 'openai-chatv2' },
            { label: 'Claude', value: 'claude' },
            { label: 'Textgen (Ooba)', value: 'ooba' },
            { label: 'Llama.cpp', value: 'llamacpp' },
            { label: 'Ollama', value: 'ollama' },
            { label: 'vLLM', value: 'vllm' },
            { label: 'Aphrodite', value: 'aphrodite' },
            { label: 'ExLlamaV2', value: 'exllamav2' },
            { label: 'KoboldCpp', value: 'koboldcpp' },
            { label: 'TabbyAPI', value: 'tabby' },
            { label: 'Mistral API', value: 'mistral' },
            { label: 'Featherless', value: 'featherless' },
            { label: 'ArliAI', value: 'arli' },
            { label: 'Google AI Studio', value: 'gemini' },
          ]}
          value={props.store.thirdPartyFormat}
          hide={props.store.service !== 'kobold'}
          onChange={(ev) => props.setter('thirdPartyFormat', ev.value as ThirdPartyFormat)}
        />

        <PresetMode state={props.store} setter={props.setter} hides={props.hides} sub={sub()} />

        <RegisteredSettings
          service={props.store.service}
          setter={props.setter}
          state={props.store}
          mode={props.store.presetMode}
        />
      </Card>
      <Show when={pane.showing()}>
        <TempSettings service={props.store.service} />
      </Show>
      <Tabs
        select={(ev) => {
          setTab(ev)
          setSearch({ preset_tab: ev })
        }}
        selected={tab}
        tabs={tabs()}
      />
      <GeneralSettings
        state={props.store}
        hides={props.hides}
        setter={props.setter}
        sub={sub()}
        tab={tabName()}
      />

      <PromptSettings
        state={props.store}
        hides={props.hides}
        setter={props.setter}
        sub={sub()}
        tab={tabName()}
      />

      <MemorySettings
        state={props.store}
        hides={props.hides}
        setter={props.setter}
        sub={sub()}
        tab={tabName()}
      />

      <SliderSettings
        state={props.store}
        hides={props.hides}
        setter={props.setter}
        sub={sub()}
        tab={tabName()}
      />

      <ToggleSettings
        state={props.store}
        hides={props.hides}
        setter={props.setter}
        sub={sub()}
        tab={tabName()}
      />
    </div>
  )
}

const TempSettings: Component<{ service?: AIAdapter }> = (props) => {
  const [settings, setSettings] = createStore({
    service: props.service,
    values: getServiceTempConfig(props.service),
  })

  createEffect(() => {
    if (settings.service === props.service) return

    const values = getServiceTempConfig(props.service)
    setSettings({ service: props.service, values })
  })

  return (
    <Show when={settings.values.length}>
      <Accordian title={<b>{ADAPTER_LABELS[props.service!]} Settings</b>} titleClickOpen open>
        <For each={settings.values}>
          {(opt) => (
            <ServiceOption
              service={props.service!}
              opt={opt}
              value={opt.value}
              field={(field) => `temp.${props.service}.${field}`}
              onChange={(value) => {
                setSettings(
                  'values',
                  updateValue(settings.values, props.service!, opt.field, value)
                )
              }}
            />
          )}
        </For>
      </Accordian>
    </Show>
  )
}

function updateValue(values: TempSetting[], service: AIAdapter, field: string, nextValue: any) {
  storage.localSetItem(`${service}.temp.${field}`, JSON.stringify(nextValue))
  return values.map<TempSetting>((val) =>
    val.field === field ? { ...val, value: nextValue } : val
  )
}
