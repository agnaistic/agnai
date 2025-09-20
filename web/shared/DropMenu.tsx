import { ChevronDown, ChevronUp } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, on, Show } from 'solid-js'
import { useEffect } from './hooks'
import { v4 } from 'uuid'

export type Horz = 'left' | 'right'
export type Vert = 'up' | 'down'

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
  horz?: Horz
  vert?: Vert
  customPosition?: string
  class?: string
  parent?: HTMLElement
}> = (props) => {
  let container!: HTMLDivElement
  let menu!: HTMLDivElement

  const [auto, setAuto] = createSignal<{ horz?: Horz; vert?: Vert }>()
  const [opened, setOpened] = createSignal(false)
  const [id, _setId] = createSignal('dropdown-' + v4())

  const onRef = () => {
    const el = menu
    // const bounds = { w: window.innerWidth, h: window.innerHeight }
    const self = el.getBoundingClientRect()
    setTimeout(() => {
      setOpened(true)
    }, 1)

    if (props.parent) {
      const parent = getBoundingRect(props.parent)

      if (!props.horz || props.horz === 'left') {
        // Left Positioning
        let pos = parent.left - self.width
        if (pos - self.width < 0) {
          pos = self.width + 24
        }
        el.style.left = `${pos}px`
      } else {
        // Right Positioning
        let pos = window.innerWidth - parent.right - self.width
        if (pos < 0) {
          pos = 24
        }

        el.style.right = `${pos}px`
      }

      if (!props.vert || props.vert === 'down') {
        // Down positioning
        let pos = parent.top + parent.height
        if (pos + self.height > window.innerHeight) {
          pos = window.innerHeight - self.height - 24
        }

        el.style.top = `${pos}px`
      } else {
        // Up positioning
        el.style.bottom = `${parent.bottom}px`
      }

      return
    }

    if (props.customPosition) {
      setAuto()
      return
    }

    let vert: Vert = 'down'
    let horz: Horz | undefined

    if (props.vert) {
      vert = props.vert
    } else if (self.y + self.height > window.innerHeight) {
      vert = 'up'
    } else if (self.y - self.height < 0) {
      vert = 'down'
    }

    if (props.horz) {
      horz = props.horz
    } else if (self.x + self.width > window.innerWidth) {
      horz = 'left'
    } else if (self.x - self.width < 0) {
      horz = 'right'
    }

    return setAuto({ vert, horz })
  }

  createEffect(
    on(
      () => props.show,
      () => {
        if (props.show) {
          onRef()
          return
        }
        setOpened(false)
      }
    )
  )

  useEffect(() => {
    const handler = (event: MouseEvent | TouchEvent) => {
      if (!opened()) return
      if (!container) return

      let dropdown: HTMLElement | null = event.target as HTMLElement

      do {
        if (!dropdown) break
        const id = dropdown.dataset?.id
        if (!id) {
          dropdown = dropdown.parentElement
          continue
        }

        if (!id.startsWith('dropdown-')) {
          dropdown = dropdown.parentElement
          continue
        }

        break
      } while (true)

      // If we are inside a dropdown then we simply won't close
      if (dropdown) {
        return
      }

      if (
        event.target instanceof Element &&
        !container.contains(event.target) &&
        event.target !== container
      ) {
        event.preventDefault()
        event.stopPropagation()
        setOpened(false)

        if (props.show) {
          props.close()
        }
      }
    }

    window.addEventListener('click', handler)
    window.addEventListener('touchend', handler)

    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('touchend', handler)
    }
  })

  const classes = createMemo(() => {
    return {
      invisible: props.show ? '' : 'hidden',
      bottom:
        !props.parent && !props.customPosition && (auto()?.vert === 'up' || props.vert === 'up')
          ? 'bottom-6'
          : '',
      right:
        !props.parent &&
        !props.customPosition &&
        !!(auto()?.horz === 'left' || props.horz === 'left')
          ? 'right-0'
          : '',
    }
  })

  return (
    <>
      <div
        ref={container!}
        class="z-50 text-sm"
        data-id={id()}
        classList={{ relative: !props.parent }}
      >
        <Show when={true}>
          <div
            ref={(ref) => {
              menu = ref
              // onRef(ref)
            }}
            class={`bg-800 absolute w-fit rounded-md border-[1px] border-[var(--bg-600)] ${
              props.class || ''
            } ${classes().bottom} ${classes().right} ${classes().invisible}`}
          >
            {props.children}
          </div>
        </Show>
      </div>
    </>
  )
}

function rectToObject(rect: DOMRect) {
  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
  }
}

function getBoundingRect(ele: HTMLElement) {
  const rect = ele.getBoundingClientRect()
  return rectToObject(rect)
}
