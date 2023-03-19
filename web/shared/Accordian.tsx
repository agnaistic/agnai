import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createSignal, JSX, Show } from 'solid-js'

const Accordian: Component<{
  title: string | JSX.Element
  children: JSX.Element
  open?: boolean
}> = (props) => {
  const [open, setOpen] = createSignal(props.open ?? true)
  return (
    <div class="w-full select-none rounded-md bg-[var(--bg-800)] bg-opacity-50 p-2">
      <div class="flex cursor-pointer items-center gap-2">
        <div class="icon-button" onClick={() => setOpen(!open())}>
          <Show when={open()} fallback={<ChevronUp />}>
            <ChevronDown />
          </Show>
        </div>
        <div>{props.title}</div>
      </div>
      <Show when={open()}>
        <div class="border-t border-[var(--bg-600)] pt-1">{props.children}</div>
      </Show>
    </div>
  )
}

export default Accordian
