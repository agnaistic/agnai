import { Accessor, createEffect, onCleanup } from 'solid-js'
import { createSignal, createRenderEffect } from 'solid-js'

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

function isDefined<T>(value: T | undefined | null): value is T {
  return typeof value !== 'undefined' && value !== null
}

function isFunction<T>(value: T | Function): value is Function {
  return typeof value === 'function'
}
