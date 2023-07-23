import { Component, For, JSX, Show, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import './toggle.css'
import { AIAdapter, PresetAISettings } from '../../common/adapters'
import { getAISettingServices } from './util'
import { Option } from './Select'

export const Toggle: Component<{
  fieldName: string
  value?: boolean
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  class?: string
  onChange?: (value: boolean) => void
  disabled?: boolean

  service?: AIAdapter
  aiSetting?: keyof PresetAISettings
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    if (props.disabled) return
    props.onChange?.(ev.currentTarget.checked)
  }

  const adapters = createMemo(() => getAISettingServices(props.aiSetting))

  const hide = createMemo(() => {
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) || shouldShow(props.aiSetting, props.value)
      ? ''
      : ` hidden `
  })

  return (
    <div class={`sm: flex flex-col gap-2 sm:flex-row ${hide()} sm:items-center sm:justify-between`}>
      <Show when={props.label}>
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>
      <label class={`toggle ${props.disabled ? 'toggle-disabled' : ''}`}>
        <input
          type="checkbox"
          class="toggle-checkbox w-0"
          id={props.fieldName}
          name={props.fieldName}
          checked={props.value}
          onChange={onChange}
          disabled={props.disabled}
        />
        <div class={`toggle-switch ${props.disabled ? 'toggle-disabled' : ''}`}></div>
      </label>
    </div>
  )
}

function shouldShow(setting?: keyof PresetAISettings, value?: boolean) {
  if (!setting) return false
  if (setting === 'gaslight' && value === true) return true
  return false
}

export const ToggleButtons: Component<{
  items: Option[]
  onChange: (opt: Option) => void
  selected: string
}> = (props) => {
  const selected = createMemo(() => {
    const idx = props.items.findIndex((opt) => opt.value === props.selected)
    return idx === -1 ? 0 : idx
  })

  return (
    <div class="flex">
      <For each={props.items}>
        {(opt, i) => {
          const isLast = props.items.length === i() + 1
          return (
            <button
              type="button"
              value={props.selected}
              class="flex items-center justify-center rounded-none border-[1px] border-[var(--hl-800)] py-2"
              classList={{
                'btn-primary': selected() === i(),
                'btn-hollow': selected() !== i(),
                'rounded-l-md': i() === 0,
                'rounded-r-md': isLast,
              }}
              onClick={() => props.onChange(opt)}
            >
              {opt.label}
            </button>
          )
        }}
      </For>
    </div>
  )
}
