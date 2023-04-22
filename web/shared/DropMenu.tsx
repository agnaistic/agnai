import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'

export const Dropup: Component<{ children: any }> = (props) => {
  const [show, setShow] = createSignal(false)

  return (
    <div class="relative text-sm">
      <button
        onClick={() => setShow(!show())}
        class="rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] py-2 px-2 hover:bg-[var(--bg-700)]"
      >
        <ChevronUp />
      </button>
      <Show when={show()}>
        <div class="absolute bottom-11 z-10 w-fit rounded-md bg-[var(--bg-700)]">
          {props.children}
        </div>
      </Show>
    </div>
  )
}

export const Dropdown: Component<{ children: any }> = (props) => {
  const [show, setShow] = createSignal(false)

  return (
    <div class="relative text-sm">
      <button
        onClick={() => setShow(!show())}
        class="rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] py-2 px-2 hover:bg-[var(--bg-700)]"
      >
        <ChevronDown />
      </button>
      <Show when={show()}>
        <div class="absolute top-11 z-10 w-fit rounded-md bg-[var(--bg-700)]">{props.children}</div>
      </Show>
    </div>
  )
}

export const DropMenu: Component<{
  show: boolean
  close: () => void
  children: any
  horz?: 'left' | 'right'
  vert?: 'up' | 'down'
  customPosition?: string
}> = (props) => {
  const position = createMemo(
    () =>
      props.customPosition ??
      `${props.vert === 'up' ? 'bottom-11' : ''} ${props.horz === 'left' ? 'right-0' : ''}`
  )
  const vert = createMemo(() => (props.vert === 'up' ? 'bottom-11' : ''))
  const horz = createMemo(() => (props.horz === 'left' ? 'right-0' : ''))

  const close = () => {
    props.close()
  }

  return (
    <>
      <Show when={props.show}>
        <div
          class="absolute top-0 left-0 z-10 h-screen w-screen bg-black bg-opacity-5"
          onClick={close}
        ></div>
      </Show>
      <div class="relative text-sm">
        <Show when={props.show}>
          <div class={`absolute ${position()} z-20 w-fit rounded-md bg-[var(--bg-800)]`}>
            {props.children}
          </div>
        </Show>
      </div>
    </>
  )
}
