import { Component, JSX, Show, createSignal, For } from 'solid-js'
import { ChevronDown } from 'lucide-solid'
import Button from './Button'

export type DropdownItem = {
  label: string
  value: string
}

const Dropdown: Component<{ label: string; items: DropdownItem[] }> = (props) => {
  const [open, setOpen] = createSignal(false)

  return (
    <div class="relative">
      <Button onClick={() => setOpen(!open())}>
        <ChevronDown />
        {props.label}
      </Button>
      <Show when={open()}>
        <div class="absolute z-10 mt-2 bg-stone-700">
          <For each={props.items}>{(item) => <Item {...item} />}</For>
        </div>
      </Show>
    </div>
  )
}

const Item: Component<DropdownItem> = ({ label, value }) => {
  return (
    <a
      class="flex cursor-pointer items-center justify-center p-2 text-sm hover:bg-stone-600"
      href="#"
    >
      {label}
    </a>
  )
}

export default Dropdown
