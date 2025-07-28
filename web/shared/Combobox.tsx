import { ChevronDown, ChevronUp, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import TextInput from './TextInput'

type ComboItem = {
  label: string
  value: string
}

export const Combobox: Component<{
  placeholder?: string
  items: ComboItem[]
  onClick: (item: ComboItem) => void
  onEnter?: (text: string) => void
  onClearClicked?: () => void
  selected?: string[]
  autoClose?: boolean
}> = (props) => {
  const [open, setOpen] = createSignal(false)
  const [text, setText] = createSignal('')

  const selected = createMemo(() => {
    const obj: { [key: string]: boolean } = {}
    if (!props.selected) return obj
    for (const value in props.selected) {
      obj[value] = true
    }
    return obj
  })

  const onClick = (item: ComboItem) => {
    props.onClick(item)
    setText('')

    if (props.autoClose) {
      setOpen(false)
    }
  }

  const filtered = createMemo(() => {
    const lowered = text().toLowerCase().trim()
    if (!lowered) return props.items
    return props.items.filter((item) => item.label.toLowerCase().includes(lowered))
  })

  return (
    <div class="relative max-w-sm" data-combo-box="">
      <div class="relative">
        <TextInput
          placeholder={props.placeholder || 'Filter...'}
          value={text()}
          onChange={(ev) => {
            setText(ev.currentTarget.value)
            setOpen(true)
          }}
          class="!py-1"
          onKeyUp={(ev) => {
            if (ev.key === 'Escape') {
              setOpen(false)
              setText('')
            }
          }}
        />

        <span
          class="absolute end-8 top-1/2 size-4 shrink-0 -translate-y-1/2 cursor-pointer"
          onClick={() => setOpen(!open())}
        >
          <Show when={open()} fallback={<ChevronDown size={16} />}>
            <ChevronUp size={16} />
          </Show>
        </span>

        <span
          class="absolute end-3 top-1/2 size-4 shrink-0 -translate-y-1/2 cursor-pointer"
          onClick={() => {
            setText('')
            setOpen(false)
            props.onClearClicked?.()
          }}
        >
          <X size={16} />
        </span>
      </div>
      <div
        class="bg-800 rounded-box shadow-base-300/20 absolute z-50 max-h-44 w-full select-none space-y-0.5 overflow-y-auto p-2 text-sm shadow-lg"
        data-combo-box-output=""
        classList={{ hidden: !open() }}
      >
        <For each={filtered()}>
          {(item) => (
            <Item onClick={() => onClick(item)} item={item} selected={selected()[item.value]} />
          )}
        </For>
      </div>
    </div>
  )
}

const Item: Component<{ onClick: () => void; item: ComboItem; selected: boolean }> = (props) => {
  return (
    <div
      class="dropdown-item combo-box-selected:dropdown-active"
      tabindex="5"
      data-combo-box-output-item=""
      onClick={props.onClick}
    >
      <div class="hover:bg-600 flex items-center justify-between hover:cursor-pointer">
        <span data-combo-box-search-text={props.item.label} data-combo-box-value={props.item.value}>
          {props.item.label}
        </span>
        <span
          classList={{ hidden: !props.selected }}
          class="icon-[tabler--check] text-primary combo-box-selected:block hidden size-4 shrink-0"
        ></span>
      </div>
    </div>
  )
}
