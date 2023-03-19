import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, JSX, Show } from 'solid-js'

const Accordian: Component<{
  show: boolean
  title: string
  children: JSX.Element
  onClick: () => void
}> = (props) => {
  return (
    <div class="w-full select-none rounded-md bg-[var(--bg-800)] p-2">
      <div class="flex cursor-pointer items-center gap-2" onClick={props.onClick}>
        <div class="icon-button">
          <Show when={props.show} fallback={<ChevronUp />}>
            <ChevronDown />
          </Show>
        </div>
        <div>{props.title}</div>
      </div>
      <Show when={props.show}>
        <div class="border-t border-[var(--bg-600)] pt-1">{props.children}</div>
      </Show>
    </div>
  )
}

export default Accordian
