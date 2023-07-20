import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'

export const Dropup: Component<{ children: any }> = (props) => {
  const [show, setShow] = createSignal(false)

  return (
    <div class="relative text-sm">
      <button
        onClick={() => setShow(!show())}
        class="bg-800 rounded-l-none rounded-r-md border-l border-[var(--bg-700)] px-2 py-2 hover:bg-[var(--bg-700)]"
      >
        <ChevronUp />
      </button>
      <Show when={show()}>
        <div class="bg-700 absolute bottom-11 z-10 w-fit rounded-md">{props.children}</div>
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
        class="bg-800 rounded-l-none rounded-r-md border-l border-[var(--bg-700)] px-2 py-2 hover:bg-[var(--bg-700)]"
      >
        <ChevronDown />
      </button>
      <Show when={show()}>
        <DropMenu show={show()} close={() => setShow(false)} vert="down" horz="right">
          <div class="flex w-48 flex-col gap-2 p-2">{props.children}</div>
        </DropMenu>
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
  class?: string
}> = (props) => {
  const position = createMemo(
    () =>
      props.customPosition ??
      `${props.vert === 'up' ? 'bottom-6' : ''} ${props.horz === 'left' ? 'right-0' : ''}`
  )

  return (
    <>
      <Show when={props.show}>
        <div
          class="fixed bottom-0 left-0 right-0 top-0 z-10 h-[100vh] w-full bg-black bg-opacity-5"
          onClick={props.close}
        ></div>
      </Show>
      <div class="relative z-50 text-sm">
        <Show when={props.show}>
          <div
            class={`absolute ${position()} bg-800 w-fit rounded-md border-[1px] border-[var(--bg-600)] ${
              props.class || ''
            }`}
          >
            {props.children}
          </div>
        </Show>
      </div>
    </>
  )
}
