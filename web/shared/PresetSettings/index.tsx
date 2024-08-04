import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Select, { Option } from '../Select'
import {
  ADAPTER_LABELS,
  AIAdapter,
  AdapterSetting,
  THIRDPARTY_FORMATS,
  ThirdPartyFormat,
} from '../../../common/adapters'
import { presetStore, settingStore, userStore } from '../../store'
import { Card } from '../Card'
import { getFormEntries, getStrictForm, getUsableServices, storage } from '../util'
import { createStore } from 'solid-js/store'
import Accordian from '../Accordian'
import { ServiceOption } from '../../pages/Settings/components/RegisteredSettings'
import { getServiceTempConfig } from '../adapter'
import Tabs from '../Tabs'
import { useSearchParams } from '@solidjs/router'
import { AgnaisticSettings } from '../../pages/Settings/Agnaistic'
import { usePaneManager } from '../hooks'
import { PresetProps, PresetTab } from './types'
import { GeneralSettings } from './General'
import { RegisteredSettings } from './Registered'
import { PromptSettings } from './Prompt'
import { SliderSettings } from './Sliders'
import { ToggleSettings } from './Toggles'
import { presetValidator } from '/common/presets'
import { AppSchema } from '/common/types'

export { PresetSettings as default }

type TempSetting = AdapterSetting & { value: any }

const PresetSettings: Component<PresetProps & { onSave: () => void }> = (props) => {
  const settings = settingStore()
  const userState = userStore()
  const [search, setSearch] = useSearchParams()
  const pane = usePaneManager()

  const services = createMemo<Option[]>(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return list
  })

  const [service, setService] = createSignal(
    props.inherit?.service || (services()[0].value as AIAdapter)
  )
  const [format, setFormat] = createSignal(
    props.inherit?.thirdPartyFormat || userState.user?.thirdPartyFormat
  )

  const sub = createMemo(() => {
    if (props.inherit?.service !== 'agnaistic') return
    const match = settings.config.subs.find(
      (sub) => sub._id === props.inherit?.registered?.agnaistic?.subscriptionId
    )

    return match
  })

  const tabs = createMemo(() => {
    const list: PresetTab[] = ['General', 'Prompt', 'Memory', 'Samplers', 'Toggles']
    if (!props.hideTabs) return list

    return list.filter((tab) => !props.hideTabs!.includes(tab))
  })
  const [tab, setTab] = createSignal(+(search.preset_tab ?? '0'))

  const onServiceChange = (opt: Option<string>) => {
    setService(opt.value as any)
    props.onService?.(opt.value as any)
  }

  onMount(() => {
    presetStore.getTemplates()
  })

  return (
    <>
      <div class="flex flex-col gap-4">
        <Card>
          <Select
            fieldName="service"
            label="AI Service"
            helperText={
              <>
                <Show when={!service()}>
                  <p class="text-red-500">
                    Warning! Your preset does not currently have a service set.
                  </p>
                </Show>
              </>
            }
            value={service()}
            items={services()}
            onChange={onServiceChange}
            disabled={props.disabled || props.disableService}
          />

          <AgnaisticSettings service={service()} inherit={props.inherit} onSave={props.onSave} />

          <Select
            fieldName="thirdPartyFormat"
            label="Self-host / 3rd-party Format"
            helperText="Re-formats the prompt to the desired output format."
            items={[
              { label: 'None', value: '' },
              { label: 'Kobold', value: 'kobold' },
              { label: 'OpenAI', value: 'openai' },
              { label: 'OpenAI (Chat Format)', value: 'openai-chat' },
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
            ]}
            value={props.inherit?.thirdPartyFormat ?? userState.user?.thirdPartyFormat ?? ''}
            service={service()}
            format={format()}
            aiSetting={'thirdPartyFormat'}
            onChange={(ev) => setFormat(ev.value as ThirdPartyFormat)}
          />

          <RegisteredSettings service={service()} inherit={props.inherit} />
        </Card>
        <Show when={pane.showing()}>
          <TempSettings service={props.inherit?.service} />
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
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={pane.showing()}
          setFormat={setFormat}
          tab={tabs()[tab()]}
          sub={sub()}
        />
        <PromptSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={pane.showing()}
          tab={tabs()[tab()]}
          sub={sub()}
        />
        <SliderSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={pane.showing()}
          tab={tabs()[tab()]}
          sub={sub()}
        />
        <ToggleSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={pane.showing()}
          tab={tabs()[tab()]}
          sub={sub()}
        />
      </div>
    </>
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

export function getPresetFormData(ref: any) {
  const cfg = settingStore.getState()
  const {
    promptOrderFormat,
    promptOrder: order,
    ...data
  } = getStrictForm(ref, {
    ...presetValidator,
    thirdPartyFormat: [...THIRDPARTY_FORMATS, ''],
    useAdvancedPrompt: 'string?',
    promptOrderFormat: 'string?',
    promptOrder: 'string?',
    modelFormat: 'string?',
    disableNameStops: 'boolean',
  })

  const registered = getRegisteredSettings(data.service as AIAdapter, ref)
  data.registered = {}
  data.registered[data.service] = registered
  data.thirdPartyFormat = data.thirdPartyFormat || (null as any)

  if (data.openRouterModel) {
    const actual = cfg.config.openRouter.models.find((or) => or.id === data.openRouterModel)
    data.openRouterModel = actual || undefined
  }

  const promptOrder: AppSchema.GenSettings['promptOrder'] = order
    ? order.split(',').map((o) => {
        const [placeholder, enabled] = o.split('=')
        return { placeholder, enabled: enabled === 'on' }
      })
    : undefined

  const entries = getFormEntries(ref)
  const stopSequences = entries.reduce<string[]>((prev, [key, value]) => {
    if (key.startsWith('stop.') && value.length) {
      prev.push(value)
    }
    return prev
  }, [])

  const phraseBias = Object.values(
    entries.reduce<any>((prev, [key, value]) => {
      if (!key.startsWith('phraseBias.')) return prev
      const [, id, prop] = key.split('.')
      if (!prev[id]) prev[id] = {}
      prev[id][prop] = prop === 'seq' ? value : +value
      return prev
    }, {}) as Array<{ seq: string; bias: number }>
  ).filter((pb: any) => 'seq' in pb && 'bias' in pb)

  const preset = { ...data, stopSequences, phraseBias, promptOrder, promptOrderFormat }
  return preset
}

export function getRegisteredSettings(service: AIAdapter | undefined, ref: any) {
  if (!service) return

  const prefix = `registered.${service}.`
  const values = getFormEntries(ref).reduce((prev, [key, value]) => {
    if (!key.startsWith(prefix)) return prev
    const field = key.replace(prefix, '')

    return Object.assign(prev, { [field]: value })
  }, {})

  return values
}

function updateValue(values: TempSetting[], service: AIAdapter, field: string, nextValue: any) {
  storage.localSetItem(`${service}.temp.${field}`, JSON.stringify(nextValue))
  return values.map<TempSetting>((val) =>
    val.field === field ? { ...val, value: nextValue } : val
  )
}
