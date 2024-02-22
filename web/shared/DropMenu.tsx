import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'
import { useEffect } from './hooks'
import { v4 } from 'uuid'

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
  let ref: HTMLDivElement
  const [auto, setAuto] = createSignal<{ horz?: Horz; vert?: Vert }>()
  const [opened, setOpened] = createSignal(false)
  const [id] = createSignal(v4())

  const onRef = (el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect()
    setTimeout(() => {
      setOpened(true)
    }, 1)

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

  useEffect(() => {
    const handler = (event: MouseEvent | TouchEvent) => {
      if (!opened()) return
      if (!ref) return

      if (event.target instanceof Element && !ref.contains(event.target) && event.target !== ref) {
        event.preventDefault()
        event.stopPropagation()
        setOpened(false)
        props.close()
        console.log('bounding rect closed')
      }
    }

    window.addEventListener('click', handler)
    window.addEventListener('touchend', handler)

    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('touchend', handler)
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
      <div ref={ref!} class="relative z-50 text-sm" data-id={id()}>
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
