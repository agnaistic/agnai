import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { settingStore } from '../store'

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

type Horz = 'left' | 'right'
type Vert = 'up' | 'down'

export const DropMenu: Component<{
  show: boolean
  close: () => void
  children: any
  horz?: Horz
  vert?: Vert
  customPosition?: string
  class?: string
}> = (props) => {
  const state = settingStore()
  const [auto, setAuto] = createSignal<{ horz?: Horz; vert?: Vert }>()
  const [opened, setOpened] = createSignal(false)

  const onRef = (el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect()
    setOpened(true)
    settingStore.toggleOverlay(true)

    if (props.customPosition) {
      setAuto()
      return
    }

    let vert: Vert = 'down'
    let horz: Horz | undefined

    if (props.vert) {
      vert = props.vert
    } else if (rect.y + rect.height > window.innerHeight) {
      vert = 'up'
    } else if (rect.y - rect.height < 0) {
      vert = 'down'
    }

    if (props.horz) {
      horz = props.horz
    } else if (rect.x + rect.width > window.innerWidth) {
      horz = 'left'
    } else if (rect.x - rect.width < 0) {
      horz = 'right'
    }

    return setAuto({ vert, horz })
  }

  createEffect(() => {
    if (!state.overlay && opened()) {
      setOpened(false)
      props.close()
    }
  })

  const position = createMemo(() => {
    if (props.customPosition) return props.customPosition

    const vert = auto() ? auto()?.vert : props.vert
    const horz = auto() ? auto()?.horz : props.horz

    return `${vert === 'up' ? 'bottom-6' : ''} ${horz === 'left' ? 'right-0' : ''}`
  })

  return (
    <>
      <div class="relative z-50 text-sm">
        <Show when={props.show}>
          <div
            ref={onRef}
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
