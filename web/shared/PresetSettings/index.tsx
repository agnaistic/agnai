import { Component, createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js'
import { Option } from '../Select'
import { ADAPTER_LABELS, AIAdapter, AdapterSetting } from '../../../common/adapters'
import { presetStore, settingStore } from '../../store'
import { getUsableServices, storage } from '../util'
import { createStore } from 'solid-js/store'
import Accordian from '../Accordian'
import { ServiceOption } from '../../pages/Settings/components/RegisteredSettings'
import { getServiceTempConfig } from '../adapter'
import Tabs from '../Tabs'
import { useSearchParams } from '@solidjs/router'
import { usePaneManager } from '../hooks'
import { GeneralSettings } from './General'
import { RegisteredSettings } from './Registered'
import { PromptSettings } from './Prompt'
import { SliderSettings } from './Sliders'
import { ToggleSettings } from './Toggles'
import { MemorySettings } from './Memory'
import { PresetMode } from './Fields'
import { PresetProvider } from '/web/pages/Settings/Provider'
import { ThirdPartyModel } from './ThirdPartyModel'
import Divider from '../Divider'
import { PresetProps, PresetTab, usePresetContext } from '/web/store/preset-context'

export { PresetSettings as default }

type TempSetting = AdapterSetting & { value: any }

const PresetSettings: Component<PresetProps & { noSave: boolean }> = (props) => {
  const settings = settingStore()
  const pane = usePaneManager()
  const [search, setSearch] = useSearchParams()
  const [tab, setTab] = createSignal(+(search.preset_tab ?? '0'))

  const [store, { setState: setter, hides, context }] = usePresetContext()

  const services = createMemo<Option[]>(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return list
  })

  createEffect(
    on(
      () => (store.service || '') + services().length,
      () => {
        if (props.disabled) return
        if (store.service) return
        if (!services().length) return
        if (store._id) return

        setter('service', services()[0].value as any)
      }
    )
  )

  const sub = createMemo(() => {
    if (store.service !== 'agnaistic') return
    const match = settings.config.subs.find(
      (sub) => sub._id === store.registered?.agnaistic?.subscriptionId
    )

    return match
  })

  const tabs = createMemo(() => {
    if (!props.hideTabs && store.presetMode === 'simple') {
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
      <div class="flex flex-col gap-2">
        <PresetProvider page={props.page} />

        <ThirdPartyModel page={props.page} sub={sub()} />

        <Divider class="!my-2" />

        <PresetMode
          state={store}
          setter={setter}
          hides={hides}
          sub={sub()}
          page={props.page}
          context={context}
        />

        <RegisteredSettings
          service={context.service}
          setter={setter}
          state={store}
          mode={store.presetMode}
        />
      </div>

      <Show when={pane.showing()}>
        <TempSettings service={context.service} />
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
        state={store}
        hides={hides}
        setter={setter}
        sub={sub()}
        tab={tabName()}
        page={props.page}
        context={context}
      />

      <PromptSettings
        state={store}
        hides={hides}
        setter={setter}
        sub={sub()}
        tab={tabName()}
        page={props.page}
        context={context}
      />

      <MemorySettings
        state={store}
        hides={hides}
        setter={setter}
        sub={sub()}
        tab={tabName()}
        page={props.page}
        context={context}
      />

      <SliderSettings
        state={store}
        hides={hides}
        setter={setter}
        sub={sub()}
        tab={tabName()}
        page={props.page}
        context={context}
      />

      <ToggleSettings
        state={store}
        hides={hides}
        setter={setter}
        sub={sub()}
        tab={tabName()}
        page={props.page}
        context={context}
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
