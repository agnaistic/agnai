import { Component, Show, createSignal, createEffect } from 'solid-js'
import type { JSX } from 'solid-js'

const RangeInput: Component<{
  label: string
  value: number
  helperText?: string
  min: number
  max: number
  step: number
}> = (props) => {
  const [value, setValue] = createSignal(props.value)
  let input: HTMLInputElement | undefined

  function updateRangeSliders() {
    if (!input) return
    const nextSize = ((+input.value - +input.min) * 100) / (+input.max - +input.min) + '% 100%'
    input.style.backgroundSize = nextSize
  }

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setValue(Number(event.currentTarget.value))
    updateRangeSliders()
  }

  createEffect(updateRangeSliders)

  return (
    <div class="relative pt-1">
      <ul class="w-full">
        <label class="form-label block-block">{props.label}</label>
        <input
          class="focusable-field float-right inline-block rounded-lg border border-white/5 bg-transparent p-1 hover:border-white/20"
          value={value()}
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          onInput={onInput}
        />
      </ul>
      <Show when={props.helperText}>
        <p class="mt-[-0.125rem] pb-2 text-sm text-white/50">{props.helperText}</p>
      </Show>
      <input
        ref={input}
        type="range"
        class="
        form-range
        h-1
        w-full
        cursor-ew-resize
        appearance-none
        rounded-xl
        accent-purple-400/50
        focus:shadow-none focus:outline-none focus:ring-0
      "
        min={props.min}
        max={props.max}
        step={props.step}
        onInput={onInput}
        value={value()}
      />
    </div>
  )
}

export default RangeInput
