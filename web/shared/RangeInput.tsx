import { Info } from 'lucide-solid'
import { Component, Show, createSignal, createEffect, createMemo } from 'solid-js'
import type { JSX } from 'solid-js'
import Tooltip from './Tooltip'
import { CreateTooltip } from './GenerationSettings'
import { AIAdapter, PresetAISettings } from '../../common/adapters'
import { getAISettingServices } from './util'

const RangeInput: Component<{
  label: string
  fieldName: string
  value: number
  helperText?: string | JSX.Element
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange?: (value: number) => void
  service?: AIAdapter
  aiSetting?: keyof PresetAISettings
  parentClass?: string
}> = (props) => {
  const adapters = createMemo(() => getAISettingServices(props.aiSetting))
  const [value, setValue] = createSignal(props.value)
  let input: HTMLInputElement | undefined

  function updateRangeSliders() {
    if (!input) return
    const nextSize = ((+input.value - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setValue(+event.currentTarget.value)
    updateRangeSliders()
    props.onChange?.(+event.currentTarget.value)
  }

  createEffect(updateRangeSliders)

  const hide = createMemo(() => {
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) ? '' : ` hidden `
  })

  return (
    <div class={`relative pt-1 ${hide()} ${props.parentClass || ''}`}>
      <ul class="w-full">
        <div class="flex flex-row gap-2">
          <label class="form-label block-block">{props.label}</label>
          <Show when={adapters()}>
            <Tooltip tip={CreateTooltip(adapters()!)} position="right">
              <Info size={20} color={'var(--hl-500)'} />
            </Tooltip>
          </Show>
        </div>
        <input
          id={props.fieldName}
          name={props.fieldName}
          class="form-field focusable-field float-right inline-block rounded-lg border border-white/5 p-1 hover:border-white/20"
          value={value()}
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          onInput={onInput}
          disabled={props.disabled}
        />
      </ul>
      <Show when={props.helperText}>
        <p class="mt-[-0.125rem] pb-2 text-sm text-[var(--text-700)]">{props.helperText}</p>
      </Show>
      <input
        ref={input}
        type="range"
        class="
        form-field
        form-range
        h-1
        w-full
        cursor-ew-resize
        appearance-none
        rounded-xl
        text-opacity-50
        accent-[var(--hl-400)]
        focus:shadow-none focus:outline-none focus:ring-0
      "
        min={props.min}
        max={props.max}
        step={props.step}
        onInput={onInput}
        value={value()}
        disabled={props.disabled}
      />
    </div>
  )
}

export default RangeInput
