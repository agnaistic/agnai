import { Component, JSX, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { getSettingColor, userStore } from '../store'
import { v4 } from 'uuid'
import Coloris from '@melloware/coloris'
import { parseHex } from './util'

Coloris.init()

const ColorPicker: Component<{
  fieldName: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  value?: string
  onChange?: (value: string) => void
  onInput?: (value: string) => void
  disabled?: boolean
}> = (props) => {
  let ref: any

  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    props.onChange?.(ev.currentTarget.value)
  }

  return (
    <div class="">
      <Show when={!!props.label || !!props.helperText}>
        <label for={props.fieldName}>
          <Show when={!!props.label}>
            <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
          </Show>
          <Show when={!!props.helperText}>
            <p class="mt-[-0.125rem] pb-2 text-sm text-[var(--text-700)]">{props.helperText}</p>
          </Show>
        </label>
      </Show>
      <input
        ref={ref}
        type="color"
        class="rounded-sm"
        value={getSettingColor(props.value || '')}
        onChange={onChange}
        onInput={(ev) => props.onInput?.(ev.currentTarget.value)}
        disabled={props.disabled}
      />
    </div>
  )
}

export default ColorPicker

export const ColorPickerV2: Component<{
  value?: string
  onInput?: (color: string, alpha?: number) => void
  onChange: (color: string, alpha?: number) => void
}> = (props) => {
  let ref: any
  const ui = userStore((s) => s.ui)
  const [id] = createSignal(v4().slice(0, 8))

  const [value, setValue] = createSignal(props.value || '#000000ff')
  const bg = createMemo(() => {
    const { r, g, b, alpha } = parseHex(value())
    return `rgba(${r}, ${g}, ${b}, ${alpha ?? 1})`
  })

  const onConfirm = (ev: any) => {
    const { alpha } = parseHex(ev.target.value)
    setValue(ev.target.value)
    props.onChange(ev.target.value, alpha)
  }

  const onInput = (ev: any) => {
    const { alpha } = parseHex(ev.target.value)
    setValue(ev.target.value)
    props.onInput?.(ev.target.value, alpha)
  }

  createEffect(() => {
    Coloris({
      el: undefined as any,
      format: 'hex',
      themeMode: ui.mode,
      forceAlpha: true,
    })
  })

  onMount(() => {})

  return (
    <input
      style={{
        background: bg(),
        color: 'rgba(255, 255, 255, 0)',
      }}
      ref={ref}
      id={id()}
      data-coloris
      class={`w-6 rounded-sm text-opacity-0 ${id()}`}
      type="text"
      onInput={onInput}
      onChange={onConfirm}
      value={value()}
    />
  )
}
