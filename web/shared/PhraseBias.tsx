import { Component, createEffect, createSignal } from 'solid-js'
import { clamp } from '/common/util'

export { PhraseBias as default }

const PhraseBias: Component<{ value?: number; clamp?: number }> = (props) => {
  const [value, setValue] = createSignal(props.value ?? 0)

  createEffect(() => {
    if (props.clamp === undefined) return
    const val = clamp(value(), props.clamp)
    setValue(val)
  })

  return null
}
