import { Component, Show } from 'solid-js'

const AvatarIcon: Component<{ avatarUrl?: string; class?: string }> = (props) => {
  return (
    <>
      <Show when={props.avatarUrl}>
        <img class={`h-8 w-8 rounded-full ${props.class || ''}`} src={props.avatarUrl} />
      </Show>
      <Show when={!props.avatarUrl}>
        <div class={`h-8 w-8 rounded-full bg-slate-700 ${props.class || ''}`}></div>
      </Show>
    </>
  )
}

export default AvatarIcon
