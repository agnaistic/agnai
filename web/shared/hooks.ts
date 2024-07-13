import { Accessor, Signal, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import { createSignal, createRenderEffect } from 'solid-js'
import { userStore } from '../store'
import { RootModal, rootModalStore } from '../store/root-modal'
import { useSearchParams } from '@solidjs/router'
import { createImageCache } from '../store/images'
import { createStore } from 'solid-js/store'
import { getSettingColor, hexToRgb } from './colors'

function getPlatform() {
  return window.innerWidth > 1024 ? 'xl' : window.innerWidth > 720 ? 'lg' : 'sm'
}

export function useWindowSize(): {
  width: Accessor<number>
  height: Accessor<number>
  platform: Accessor<'sm' | 'lg' | 'xl'>
} {
  const [width, setWidth] = createSignal(0)
  const [height, setHeight] = createSignal(0)
  const [platform, setPlatform] = createSignal<'sm' | 'lg' | 'xl'>(getPlatform())

  const handler = () => {
    setWidth(window.innerWidth)
    setHeight(window.innerHeight)
    setPlatform(getPlatform())
  }

  useEffect(() => {
    window.addEventListener('resize', handler)

    return () => window.removeEventListener('resize', handler)
  })

  createRenderEffect(() => {
    handler()
  })

  return { width, height, platform }
}

export type ImageCache = ReturnType<typeof useImageCache>

type ImageCacheOpts = {
  clean?: boolean
  include?: string[]
}

export function useImageCache(collection: string, opts: ImageCacheOpts = {}) {
  const reel = createImageCache(collection)

  const cleanIds = (imageId: string) => imageId.replace(`${collection}-`, '')

  const [state, setState] = createStore({
    id: collection,
    image: '',
    pos: 0,
    imageId: '',
    images: [] as string[],
  })

  if (opts.clean) {
    reel.removeAll()
  }

  const start = opts.clean ? reel.removeAll() : Promise.resolve()

  // Initialise the reel
  start.then(reel.getImageIds).then(async (images) => {
    if (!images.length) {
      setState({ images: images.map(cleanIds) })
      return
    }

    const current = images.length - 1
    const image = await reel.getImage(images[current])

    setState({ pos: current, image, images: images.map(cleanIds), imageId: images[current] })
  })

  const next = async () => {
    let pos = -1
    if (state.images[state.pos + 1]) {
      pos = state.pos + 1
    } else if (state.images[0]) {
      pos = 0
    }

    if (pos === -1) return

    const image = await reel.getImage(state.images[pos])
    setState({ pos: pos, image, imageId: state.images[pos] })
  }

  const prev = async () => {
    let pos = -1
    if (state.images[state.pos - 1]) {
      pos = state.pos - 1
    } else if (state.images[state.images.length - 1]) {
      pos = state.images.length - 1
    }

    if (pos === -1) return

    const image = await reel.getImage(state.images[pos])
    setState({ pos: pos, image, imageId: state.images[pos] })
  }

  const addImage = async (base64: string, id?: string) => {
    const images = await reel.addImage(base64, id)

    setState({
      images: images.map(cleanIds),
      pos: images.length - 1,
      imageId: images[images.length - 1],
      image: base64,
    })
  }

  const removeImage = async (imageId: string) => {
    const images = await reel.removeImage(imageId)

    // Automatically load the deleted image's ancestor if it is available
    if (imageId === state.imageId) {
      let pos = -1
      if (images[state.pos]) {
        pos = state.pos
      } else if (state.pos > 0 && images[state.pos - 1]) {
        pos = state.pos - 1
      } else if (images[0]) {
        pos = 0
      }

      if (pos >= 0) {
        const image = await reel.getImage(images[pos])
        setState({ images: images.map(cleanIds), image, pos, imageId: images[pos] })
      } else {
        setState({ images: images.map(cleanIds), pos: 0, image: '', imageId: '' })
      }

      return
    }

    setState({ images: images.map(cleanIds) })
  }

  return {
    state,
    next,
    prev,
    addImage,
    removeImage,
  }
}

export function usePane() {
  const windowSize = useWindowSize()
  const isSmallScreen = createMemo(() => windowSize.width() < 960)
  const paneDisplay = createMemo(() => (isSmallScreen() ? 'popup' : 'pane'))
  return paneDisplay
}

export function useDeviceType() {
  const [isMobile, setMobile] = createSignal(/Mobi/i.test(window.navigator.userAgent))

  useEffect(() => {
    const timer = setInterval(() => {
      setMobile(/Mobi/i.test(window.navigator.userAgent))
    }, 100)

    return () => clearInterval(timer)
  })

  return isMobile
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

export function useLocalStorage<T = any>(id: string, initialValue: T) {
  const init = getStoredValue(id, initialValue)
  const [value, setValue] = createSignal<T>(init)

  const update = (next: T) => {
    setStoredValue(id, next)
    setValue(next as any)
    return next
  }

  return [value, update] as Signal<T>
}

export function getStoredValue<T = any>(id: string, initialValue: T) {
  const key = `agnaistic-ls-${id}`
  const init = localStorage.getItem(key) || JSON.stringify(initialValue)
  const value = JSON.parse(init)
  return value
}

export function setStoredValue(id: string, value: any) {
  const key = `agnaistic-ls-${id}`
  localStorage.setItem(key, JSON.stringify(value))
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

export const usePaneManager = () => {
  const [search, setSearch] = useSearchParams()
  const [showing, setShowing] = createSignal(
    search.pane !== undefined && typeof search.pane === 'string'
  )
  const [pane, setPane] = createSignal(search.pane)

  createEffect(() => {
    const next = search.pane !== undefined && typeof search.pane === 'string'
    setShowing(next)
    setPane(search.pane)
  })
  return { showing, update: (pane?: string) => setSearch({ pane }), pane }
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
  const [loaded, setLoaded] = createSignal(false)
  const [platform, setPlatform] = createSignal<'sm' | 'lg' | 'xl'>()

  const [obs] = createSignal(
    new ResizeObserver((cb) => {
      const ele = cb[0]
      if (!ele) return
      setSize({ w: ele.target.clientWidth, h: ele.target.clientHeight })
      setPlatform(getWidthPlatform(ele.target.clientWidth))
    })
  )

  const load = (ref: HTMLElement) => {
    if (!ref) return
    setLoaded(true)
    obs().observe(ref)
    setSize({ w: ref.clientWidth, h: ref.clientHeight })
    setPlatform(getWidthPlatform(ref.clientWidth || 0))
  }

  onCleanup(() => {
    obs().disconnect()
  })

  return { size, load, loaded, platform }
}

export function getWidthPlatform(width: number) {
  return width > 1024 ? 'xl' : width > 720 ? 'lg' : 'sm'
}

export function getPagePlatform(width: number) {
  return width > 1600 ? 'xl' : width > 1024 ? 'lg' : 'sm'
}

export function useGoogleReady() {
  const [ready, setReady] = createSignal(false)

  createEffect(() => {
    const timer = setInterval(() => {
      const win: any = window
      if (win.default_gsi) {
        console.log('ready')
        setReady(true)
        clearInterval(timer)
      } else {
        console.log('not ready')
      }
    }, 500)

    return () => clearInterval(timer)
  })

  return ready
}
