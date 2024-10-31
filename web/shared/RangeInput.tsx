import { Component, Show, createSignal, createEffect } from 'solid-js'
import type { JSX } from 'solid-js'
import { PresetAISettings, samplerDisableValues } from '../../common/adapters'
import { markdown } from './markdown'

const RangeInput: Component<{
  label: string | JSX.Element
  fieldName: string
  value: number
  helperText?: string | JSX.Element
  helperMarkdown?: string
  min: number
  max: number
  step: number
  disabled?: boolean
  recommended?: number | string
  recommendLabel?: string | JSX.Element
  onChange?: (value: number) => void
  parentClass?: string
  aiSetting?: keyof PresetAISettings
  hide?: boolean
}> = (props) => {
  const [previousPropsValue, setPreviousPropsValue] = createSignal(props.value)
  const [value, setValue] = createSignal(props.value)
  let input: HTMLInputElement | undefined

  function updateRangeSliders() {
    if (props.value !== previousPropsValue()) {
      setValue(props.value)
      setPreviousPropsValue(props.value)
    }
    if (!input) return
    const value = Math.min(+input.value, +input.max)
    const nextSize = ((value - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setValue(+event.currentTarget.value)
    updateRangeSliders()
    props.onChange?.(+event.currentTarget.value)
  }

  createEffect(updateRangeSliders)

  const disableSampler = () => {
    if (value === undefined) return

    setValue(value)
  }

  return (
    <div class={`relative pt-1 ${props.parentClass || ''}`} classList={{ hidden: props.hide }}>
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
        <p class="helper-text">{props.helperText}</p>
      </Show>
      <Show when={!!props.helperMarkdown}>
        <p class="helper-text markdown" innerHTML={markdown.makeHtml(props.helperMarkdown!)}></p>
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

export const InlineRangeInput: Component<{
  fieldName: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange?: (value: number) => void
  hide?: boolean
  parentClass?: string
}> = (props) => {
  const [value, setValue] = createSignal(props.value)
  let input: HTMLInputElement | undefined

  function updateRangeSliders() {
    if (!input) return
    const value = Math.min(+input.value, +input.max)
    const nextSize = ((value - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setValue(+event.currentTarget.value)
    updateRangeSliders()
    props.onChange?.(+event.currentTarget.value)
  }

  createEffect(updateRangeSliders)
  return (
    <div
      class={`bg-800 flex items-center gap-2 rounded-xl px-2 ${props.parentClass || ''}`}
      classList={{ hidden: props.hide }}
    >
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
    </div>
  )
}

export default RangeInput
