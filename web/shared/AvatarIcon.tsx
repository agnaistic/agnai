import { Bot, VenetianMask } from 'lucide-solid'
import { Component, createMemo, Show } from 'solid-js'

const AvatarIcon: Component<{
  avatarUrl?: string
  class?: string
  bot?: boolean
  size?: string | number
}> = (props) => {
  const cls = createMemo(() => props.class || '')
  const size = createMemo(() => (props.size ? `h-${props.size} w-${props.size}` : 'h-8 w-8'))

  return (
    <>
      <Show when={props.avatarUrl}>
        <img class={`${size()} rounded-full object-cover ${cls()}`} src={props.avatarUrl} />
      </Show>
      <Show when={!props.avatarUrl}>
        <div
          class={`flex ${size()} items-center justify-center rounded-full bg-[var(--bg-600)] ${cls()}`}
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
