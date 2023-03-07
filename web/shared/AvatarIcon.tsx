import { Bot, VenetianMask } from 'lucide-solid'
import { Component, Show } from 'solid-js'

const AvatarIcon: Component<{ avatarUrl?: string; class?: string; bot?: boolean }> = (props) => {
  return (
    <>
      <Show when={props.avatarUrl}>
        <img
          class={`h-8 w-8 rounded-full bg-black object-scale-down ${props.class || ''}`}
          src={props.avatarUrl}
        />
      </Show>
      <Show when={!props.avatarUrl}>
        <div
          class={`flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-600)] ${
            props.class || ''
          }`}
        >
          <Show when={!props.bot}>
            <VenetianMask />
          </Show>
          <Show when={props.bot}>
            <Bot />
          </Show>
        </div>
      </Show>
    </>
  )
}

export default AvatarIcon
