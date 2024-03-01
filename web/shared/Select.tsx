import { Component, JSX, For, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import { ChevronDown } from 'lucide-solid'
import { AIAdapter, PresetAISettings, ThirdPartyFormat } from '../../common/adapters'
import { getAISettingServices, isValidServiceSetting } from './util'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const Select: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  helperMarkdown?: string
  items: Option[]
  value?: string
  class?: string
  disabled?: boolean
  classList?: Record<string, boolean>
  onChange?: (item: Option) => void

  service?: AIAdapter
  format?: ThirdPartyFormat
  aiSetting?: keyof PresetAISettings
  ref?: (ref: HTMLSelectElement) => void
  hide?: boolean
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    if (!props.onChange) return
    const item = props.items.find((item) => item.value === ev.currentTarget.value)
    props.onChange(item!)
  }

  const hide = createMemo(() => {
    if (props.hide) return ' hidden'
    const isValid = isValidServiceSetting(props.service, props.format, props.aiSetting)
    return isValid ? '' : ' hidden'
  })

  return (
    <div class={`${hide()} max-w-full`} classList={props.classList}>
      <FormLabel
        label={props.label}
        helperText={props.helperText}
        helperMarkdown={props.helperMarkdown}
      />
      <div class="flex items-center">
        <div class="relative overflow-hidden rounded-xl bg-transparent">
          <select
            ref={(ele) => props.ref?.(ele)}
            name={props.fieldName}
            class={`form-field cursor-pointer appearance-none rounded-xl bg-[var(--hl-700)] py-2 pl-3 pr-8 shadow-none ${
              props.class || ''
            }`}
            onChange={onChange}
            disabled={props.disabled}
          >
            <For each={props.items}>
              {(item) => (
                <option
                  class="bg-[var(--hl-500)])] border-0 border-none"
                  value={item.value}
                  selected={props.value === item.value}
                >
                  {item.label}
                </option>
              )}
            </For>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
            <ChevronDown />
          </div>
        </div>
      </div>
    </div>
  )
}

export const MiniSelect: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: Option[]
  value?: string
  class?: string
  disabled?: boolean
  onChange?: (item: Option) => void

  service?: AIAdapter
  aiSetting?: keyof PresetAISettings
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    if (!props.onChange) return
    const item = props.items.find((item) => item.value === ev.currentTarget.value)
    props.onChange(item!)
  }

  const adapters = createMemo(() => getAISettingServices(props.aiSetting))

  const hide = createMemo(() => {
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) ? '' : ` hidden `
  })

  return (
    <div class={`${hide()} max-w-full`}>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="flex items-center">
        <div class="relative overflow-hidden rounded-xl bg-transparent">
          <select
            name={props.fieldName}
            class={`form-field w-10 cursor-pointer appearance-none rounded-xl bg-[var(--hl-700)] px-5 py-2 shadow-none ${
              props.class || ''
            }`}
            onChange={onChange}
            disabled={props.disabled}
          >
            <For each={props.items}>
              {(item) => (
                <option
                  class="bg-[var(--hl-500)])] border-0 border-none"
                  value={item.value}
                  selected={props.value === item.value}
                >
                  {item.label}
                </option>
              )}
            </For>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
            <ChevronDown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Select

4
