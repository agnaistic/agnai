import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createMemo, createSignal, JSX, Show } from 'solid-js'

const Accordian: Component<{
  title: string | JSX.Element
  children: JSX.Element
  open?: boolean
  class?: string
  titleClickOpen?: boolean
}> = (props) => {
  const [open, setOpen] = createSignal(props.open ?? true)
  const cls = createMemo(() => (open() ? '' : 'hidden'))
  return (
    <div
      class={`w-full select-none rounded-md bg-[var(--bg-700)] bg-opacity-50 p-2 ${
        props.class || ''
      }`}
    >
      <div class="flex cursor-pointer items-center gap-2">
        <div class="icon-button" onClick={() => setOpen(!open())}>
          <Show when={open()} fallback={<ChevronUp />}>
            <ChevronDown />
          </Show>
        </div>
        <div
          class="w-full"
          onClick={() => {
            if (props.titleClickOpen) setOpen(!open())
          }}
        >
          {props.title}
        </div>
      </div>
      <div class={`border-t border-[var(--bg-600)] pt-1 ${cls()}`}>{props.children}</div>
    </div>
  )
}

export default Accordian
