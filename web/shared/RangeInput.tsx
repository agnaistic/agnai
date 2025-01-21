import { Component, Show, createEffect, createSignal, on } from 'solid-js'
import type { JSX } from 'solid-js'
import { PresetAISettings, samplerDisableValues } from '../../common/adapters'
import { markdown } from './markdown'

const RangeInput: Component<{
  label: string | JSX.Element
  fieldName?: string
  value: number
  helperText?: string | JSX.Element
  helperMarkdown?: string
  min: number
  max: number
  step: number
  disabled?: boolean
  recommended?: number | string
  recommendLabel?: string | JSX.Element
  onChange: (value: number) => void
  parentClass?: string
  aiSetting?: keyof PresetAISettings
  hide?: boolean
}> = (props) => {
  let input: HTMLInputElement | undefined
  let slider: HTMLInputElement | undefined

  const [display, setDisplay] = createSignal(props.value.toString())

  function updateRangeSliders(evented: boolean, next?: string) {
    if (!input || !slider) return

    if (!evented && next === undefined) {
      return
    }

    const parsed = next !== undefined ? next || '0' : '0'

    if (isNaN(+parsed)) {
      input.value = display()
      slider.value = display()
      return
    }

    input.value = parsed
    // slider.value = parsed
    setDisplay(parsed)

    const percent = Math.min(+parsed, +input.max)
    const nextSize = ((percent - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize

    if (next !== undefined) {
      props.onChange(+parsed)
    }

    // const value = next ?? props.value
    // if (value === undefined) return
    // if (!input || !slider) return

    // input.value = value as any
    // slider.value = value as any

    // if (next !== undefined) {
    //   props.onChange(next)
    // }
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    updateRangeSliders(true, event.currentTarget.value as any)
    // props.onChange(+event.currentTarget.value)
  }

  createEffect(
    on(
      () => props.value,
      () => updateRangeSliders(false, props.value.toString())
    )
  )

  const disableSampler = () => {
    if (!props.aiSetting) return
    const value = samplerDisableValues[props.aiSetting]
    if (value === undefined) return
    updateRangeSliders(true, value.toString())
  }

  return (
    <div
      class={`relative pt-1 ${props.parentClass || ''}`}
      classList={{ hidden: props.hide ?? false }}
    >
      <ul class="w-full">
        <div class="flex flex-row justify-between gap-2">
          <span>
            <label class="form-label">{props.label}</label>
            <Show when={props.recommended !== undefined}>
              <span class="text-xs italic text-gray-500">
                &nbsp;({props.recommendLabel || 'Recommended'}: {props.recommended?.toString()})
              </span>
            </Show>
          </span>

          <Show when={props.aiSetting && props.aiSetting in samplerDisableValues}>
            <a class="link text-xs" onClick={disableSampler}>
              Disable
            </a>
          </Show>
        </div>
      </ul>
      <Show when={props.helperText}>
        <p class="helper-text">{props.helperText}</p>
      </Show>
      <Show when={!!props.helperMarkdown}>
        <p class="helper-text markdown" innerHTML={markdown.makeHtml(props.helperMarkdown!)}></p>
      </Show>
      <div class="flex w-full items-center gap-2">
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
          value={props.value}
          disabled={props.disabled}
        />
        <input
          ref={slider}
          id={props.fieldName}
          name={props.fieldName}
          class="form-field focusable-field border-0.25 min-w-12 float-right box-border inline-block w-fit rounded-lg border border-[var(--bg-600)] p-1 hover:border-white/20"
          value={props.value}
          min={props.min}
          type="number"
          max={props.max}
          step={props.step}
          onInput={onInput}
          // onKeyDown={(ev) => {
          //   if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return

          //   const places = (props.step.toString().split('.')[1] || '').length
          //   const dir = ev.key === 'ArrowDown' ? -props.step : props.step
          //   let value = round(props.value + dir, places)
          //   if (props.max !== undefined) value = Math.min(value, props.max)
          //   if (props.min !== undefined) value = Math.max(value, props.min)
          //   updateRangeSliders(value.toString())
          // }}
          disabled={props.disabled}
        />
      </div>
    </div>
  )
}

export const InlineRangeInput: Component<{
  fieldName: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
  hide?: boolean
  parentClass?: string
  label?: string
  aiSetting?: keyof PresetAISettings
}> = (props) => {
  let input: HTMLInputElement | undefined
  let slider: HTMLInputElement | undefined

  function updateRangeSliders(next?: number) {
    const value = next ?? props.value
    if (!input || !slider) return

    input.value = value as any
    slider.value = value as any

    const percent = Math.min(+input.value, +input.max)
    const nextSize = ((percent - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize

    if (next !== undefined) {
      props.onChange(next)
    }
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    updateRangeSliders()
    props.onChange?.(+event.currentTarget.value)
  }

  createEffect(
    on(
      () => props.value,
      () => updateRangeSliders()
    )
  )

  const disableSampler = () => {
    if (!props.aiSetting) return
    const value = samplerDisableValues[props.aiSetting]
    if (value === undefined) return
    updateRangeSliders(value)
  }

  return (
    <div
      class={`bg-800 flex items-center gap-2 rounded-xl px-2 ${props.parentClass || ''}`}
      classList={{ hidden: props.hide ?? false }}
    >
      <Show when={props.label}>
        <div class="bold">{props.label}</div>
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
        value={props.value}
        disabled={props.disabled}
      />
      <input
        ref={slider}
        id={props.fieldName}
        name={props.fieldName}
        class="form-field focusable-field float-right inline-block rounded-lg border border-white/5 p-1 hover:border-white/20"
        value={props.value}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        onInput={onInput}
        disabled={props.disabled}
      />

      <Show when={props.aiSetting && props.aiSetting in samplerDisableValues}>
        <a class="link text-xs" onClick={disableSampler}>
          Disable
        </a>
      </Show>
    </div>
  )
}

export default RangeInput
