import { Component } from 'solid-js'

const Divider: Component<{ class?: string }> = (props) => (
  <div class={`my-4 border-b border-[var(--bg-700)] ${props.class || ''}`} aria-hidden="true" />
)

export default Divider
