import { Accessor, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import { createSignal, createRenderEffect } from 'solid-js'
import { getSettingColor, userStore } from '../store'
import { hexToRgb } from './util'
import { RootModal, rootModalStore } from '../store/root-modal'

export function useWindowSize(): {
  width: Accessor<number>
  height: Accessor<number>
} {
  const [width, setWidth] = createSignal(0)
  const [height, setHeight] = createSignal(0)

  const handler = () => {
    setWidth(window.innerWidth)
    setHeight(window.innerHeight)
  }

  useEffect(() => {
    window.addEventListener('resize', handler)

    return () => window.removeEventListener('resize', handler)
  })

  createRenderEffect(() => {
    handler()
  })

  return { width, height }
}

export function usePane() {
  const windowSize = useWindowSize()
  const isSmallScreen = createMemo(() => windowSize.width() < 768)
  const paneDisplay = createMemo(() => (isSmallScreen() ? 'popup' : 'pane'))
  return paneDisplay
}

export function useDraft(id: string) {
  const key = `chat:${id}:draft`
  const text = localStorage.getItem(key) || ''

  const restore = () => {
    const text = localStorage.getItem(key)
    return text || ''
  }

  const update = (value?: string) => {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  }

  const clear = () => {
    localStorage.removeItem(key)
  }

  return { text, restore, update, clear }
}

export function clearDraft(id: string) {
  const key = `chat:${id}:draft`
  localStorage.removeItem(key)
}

export function useEffect(callback: () => void | Function): void {
  createEffect(() => {
    if (isDefined(callback) && isFunction(callback)) {
      const cleanup = callback()
      if (isFunction(cleanup)) {
        onCleanup(() => cleanup())
      }
    }

    return
  })
}

export function useBgStyle(props: { hex: string; opacity?: number; blur: boolean }) {
  const user = userStore()

  const bgStyle = createMemo(() => {
    // This causes this memoized value to re-evaluated as it becomes a subscriber of ui.mode
    user.ui.mode
    const color = getSettingColor(props.hex)
    const rgb = hexToRgb(color)
    if (!rgb) return {}

    const opacity = props.opacity?.toString() ?? user.ui.msgOpacity.toString()
    return {
      background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
      ...(props.blur ? { 'backdrop-filter': 'blur(5px)' } : {}),
    }
  })

  return bgStyle
}

function isDefined<T>(value: T | undefined | null): value is T {
  return typeof value !== 'undefined' && value !== null
}

function isFunction<T>(value: T | Function): value is Function {
  return typeof value === 'function'
}

export function useRootModal(modal: RootModal) {
  onMount(() => rootModalStore.addModal(modal))
  onCleanup(() => rootModalStore.removeModal(modal.id))
}

/**
 * Use: Call `load(ref)` during `onMount(...)` to ensure the reference element is ready.
 */
export function useResizeObserver() {
  const [size, setSize] = createSignal({ w: 0, h: 0 })
  const [obs] = createSignal(
    new ResizeObserver((cb) => {
      const ele = cb[0]
      if (!ele) return
      setSize({ w: ele.target.clientWidth, h: ele.target.clientHeight })
    })
  )

  const load = (ref: HTMLElement) => {
    if (!ref) return
    obs().observe(ref)
    setSize({ w: ref.clientWidth, h: ref.clientHeight })
  }

  onCleanup(() => {
    obs().disconnect()
  })

  return { size, load }
}
