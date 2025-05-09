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
  let range: HTMLInputElement | undefined
  let input: HTMLInputElement | undefined

  const [display, setDisplay] = createSignal(props.value.toString())

  function updateRangeSliders(evented: boolean, source: 'slider' | 'input', next?: string) {
    if (!range || !input) return

    if (!evented) {
      return
    }

    const parsed = next !== undefined ? next || '0' : '0'

    if (isNaN(+parsed)) {
      range.value = display()
      input.value = display()
      return
    }

    range.value = parsed

    if (source === 'slider') {
      input.value = parsed
    }

    setDisplay(parsed)

    const percent = Math.min(+parsed, +range.max)
    const nextSize = ((percent - +range.min) * 100) / (+range.max - +range.min) + '% 100%'
    range.style.backgroundSize = nextSize

    if (evented && next !== undefined) {
      props.onChange(+parsed)
    }
  }

  const onInput = (source: 'slider' | 'input') => {
    const callback: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
      updateRangeSliders(true, source, event.currentTarget.value as any)
      // props.onChange(+event.currentTarget.value)
    }
    return callback
  }

  createEffect(
    on(
      () => props.value,
      () => updateRangeSliders(false, 'input', props.value.toString())
    )
  )

  const disableSampler = () => {
    if (!props.aiSetting) return
    const value = samplerDisableValues[props.aiSetting]
    if (value === undefined) return
    updateRangeSliders(true, 'input', value.toString())
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
          ref={range}
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
          onInput={onInput('slider')}
          value={props.value}
          disabled={props.disabled}
        />
        <input
          ref={input}
          id={props.fieldName}
          name={props.fieldName}
          class="form-field focusable-field border-0.25 float-right box-border inline-block min-w-24 rounded-lg border border-[var(--bg-600)] p-1 hover:border-white/20"
          value={props.value}
          min={props.min}
          type="number"
          max={props.max}
          step={props.step}
          onInput={onInput('input')}
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
  inputClass?: string
  label?: string
  aiSetting?: keyof PresetAISettings
}> = (props) => {
  let range: HTMLInputElement | undefined
  let input: HTMLInputElement | undefined

  const [display, setDisplay] = createSignal(props.value.toString())

  function updateRangeSliders(evented: boolean, source: 'slider' | 'input', next?: string) {
    if (!range || !input) return

    if (!evented) {
      return
    }

    const parsed = next !== undefined ? next || '0' : '0'

    if (isNaN(+parsed)) {
      range.value = display()
      input.value = display()
      return
    }

    range.value = parsed

    if (source === 'slider') {
      input.value = parsed
    }

    setDisplay(parsed)

    const percent = Math.min(+parsed, +range.max)
    const nextSize = ((percent - +range.min) * 100) / (+range.max - +range.min) + '% 100%'
    range.style.backgroundSize = nextSize

    if (evented && next !== undefined) {
      props.onChange(+parsed)
    }
  }

  const onInput = (source: 'slider' | 'input') => {
    const callback: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
      updateRangeSliders(true, source, event.currentTarget.value as any)
      // props.onChange(+event.currentTarget.value)
    }
    return callback
  }

  createEffect(
    on(
      () => props.value,
      () => updateRangeSliders(false, 'input', props.value.toString())
    )
  )

  const disableSampler = () => {
    if (!props.aiSetting) return
    const value = samplerDisableValues[props.aiSetting]
    if (value === undefined) return
    updateRangeSliders(true, 'input', value.toString())
  }

  return (
    <div
      class={`bg-800 flex items-center gap-2 rounded-xl px-2 ${props.parentClass || ''}`}
      classList={{ hidden: props.hide ?? false }}
    >
      <Show when={props.label}>
        <div class="bold min-w-fit">{props.label}</div>
      </Show>
      <input
        ref={range}
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
        onInput={onInput('slider')}
        value={props.value}
        disabled={props.disabled}
      />
      <input
        ref={input}
        id={props.fieldName}
        name={props.fieldName}
        class="form-field focusable-field border-0.25 float-right box-border inline-block w-32 rounded-lg border border-[var(--bg-600)] p-1 hover:border-white/20"
        value={props.value}
        min={props.min}
        type="number"
        max={props.max}
        step={props.step}
        onInput={onInput('input')}
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
