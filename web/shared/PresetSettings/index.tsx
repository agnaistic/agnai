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
import { PresetProps, PresetTab } from '/web/store/preset-context'

export { PresetSettings as default }

type TempSetting = AdapterSetting & { value: any }

const PresetSettings: Component<PresetProps & { noSave: boolean; noModel?: boolean }> = (props) => {
  const settings = settingStore((s) => ({ config: s.config }))
  const pane = usePaneManager()
  const [search, setSearch] = useSearchParams()
  const [tab, setTab] = createSignal(+(search.preset_tab ?? '0'))

  const services = createMemo<Option[]>(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return list
  })

  createEffect(
    on(
      () => (props.state.service || '') + services().length,
      () => {
        if (props.disabled) return
        if (props.state.service) return
        if (!services().length) return
        if (props.state._id) return

        props.setters.setState('service', services()[0].value as any)
      }
    )
  )

  const sub = createMemo(() => {
    if (props.state.service !== 'agnaistic') return
    const subId =
      props.state.providerModels?.agnaistic || props.state.registered?.agnaistic?.subscriptionId
    const match = settings.config.subs.find((sub) => sub._id === subId)

    return match
  })

  const tabs = createMemo(() => {
    if (!props.hideTabs && props.state.presetMode === 'simple') {
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
        <Show when={!props.noModel}>
          <PresetProvider state={props.state} setters={props.setters} page={props.page} />

          <ThirdPartyModel
            state={props.state}
            setters={props.setters}
            page={props.page}
            sub={sub()}
          />

          <Divider class="!my-2" />
        </Show>

        <PresetMode state={props.state} setters={props.setters} sub={sub()} page={props.page} />

        <RegisteredSettings
          service={props.setters.context.service}
          setters={props.setters}
          state={props.state}
        />
      </div>

      <Show when={pane.showing()}>
        <TempSettings service={props.setters.context.service} />
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
        state={props.state}
        setters={props.setters}
        sub={sub()}
        tab={tabName()}
        page={props.page}
      />

      <PromptSettings
        state={props.state}
        setters={props.setters}
        sub={sub()}
        tab={tabName()}
        page={props.page}
      />

      <MemorySettings
        state={props.state}
        setters={props.setters}
        sub={sub()}
        tab={tabName()}
        page={props.page}
      />

      <SliderSettings
        state={props.state}
        setters={props.setters}
        sub={sub()}
        tab={tabName()}
        page={props.page}
      />

      <ToggleSettings
        state={props.state}
        setters={props.setters}
        sub={sub()}
        tab={tabName()}
        page={props.page}
      />
    </div>
  )
}

const TempSettings: Component<{ service?: AIAdapter }> = (props) => {
  const [settings, setSettings] = createStore({
    service: props.service,
    values: getServiceTempConfig(props.service),
  })

  createEffect(
    on(
      () => [props.service],
      () => {
        if (settings.service === props.service) return

        const values = getServiceTempConfig(props.service)
        setSettings({ service: props.service, values })
      }
    )
  )

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
