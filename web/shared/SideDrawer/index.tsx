import { Component, JSX, Show } from 'solid-js'
import './side-drawer.css'

const SideDrawer: Component<{
  show: boolean
  children: JSX.Element
  footer?: JSX.Element
  right?: boolean
}> = (props) => {
  return (
    <div
      class={`side-drawer flex flex-col gap-4 pt-4 ${props.show && 'side-drawer--hide'} absolute`}
    >
      <div class="side-drawer__content flex flex-col gap-2 px-4">{props.children}</div>
      <Show when={props.footer}>
        <div class="flex h-16 w-full items-center justify-between border-t-2 border-[var(--bg-800)] px-4 ">
          {props.footer}
        </div>
      </Show>
    </div>
  )
}

export default SideDrawer
