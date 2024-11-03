import { Accessor, JSX, Signal, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import { createSignal, createRenderEffect } from 'solid-js'
import { RootModal, rootModalStore } from '../store/root-modal'
import { useLocation, useSearchParams } from '@solidjs/router'
import { createImageCache } from '../store/images'
import { createStore } from 'solid-js/store'
import { getSettingColor, hexToRgb } from './colors'
import { getAssetUrl } from './util'
import { AutoPreset, getPresetOptions } from './adapter'
import { ADAPTER_LABELS } from '/common/adapters'
import { getStore } from '../store/create'

const PANE_BREAKPOINT = 1280

export function getPlatform() {
  return window.innerWidth >= 1280 ? 'xl' : window.innerWidth > 720 ? 'lg' : 'sm'
}

export function usePresetOptions() {
  const presets = getStore('presets')((s) => s.presets)
  const user = getStore('user')()

  const options = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter((pre) => pre.value !== 'chat')
    const combined = [
      { label: 'System Built-in Preset (Horde)', value: AutoPreset.service, custom: false },
    ].concat(opts)

    const defaultPreset = presets.find((p) => p._id === user.user?.defaultPreset)
    if (defaultPreset) {
      const label = ADAPTER_LABELS[defaultPreset.service!]
      combined.unshift({
        label: `[${label}] Your Default Preset`,
        value: '',
        custom: true,
      })
    }
    return combined
  })

  return options
}

export function useWindowSize(): {
  width: Accessor<number>
  height: Accessor<number>
  platform: Accessor<'sm' | 'lg' | 'xl'>
  pane: Accessor<boolean>
} {
  const [width, setWidth] = createSignal(0)
  const [height, setHeight] = createSignal(0)
  const [platform, setPlatform] = createSignal<'sm' | 'lg' | 'xl'>(getPlatform())
  const [pane, setPane] = createSignal(canUsePane())

  const handler = () => {
    setWidth(window.innerWidth)
    setHeight(window.innerHeight)
    setPlatform(getPlatform())
    setPane(canUsePane())
  }

  useEffect(() => {
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  })

  createRenderEffect(() => {
    handler()
  })

  return { width, height, platform, pane }
}

export type ImageCache = ReturnType<typeof useImageCache>

type ImageCacheOpts = {
  clean?: boolean
  include?: string[]
}

export function useRef<T = HTMLElement>() {
  const [ref, setRef] = createSignal<T | undefined>()

  const onRef = (ele: T) => {
    setRef(ele as any)
  }

  return [ref, onRef] as const
}

export function isChatPage(noSaga?: boolean) {
  const location = useLocation()
  const isChat = createMemo(() => {
    if (noSaga) {
      return location.pathname.startsWith('/chat/')
    }

    return location.pathname.startsWith('/chat/') || location.pathname.startsWith('/saga/')
  })

  return isChat
}

export function useCharacterBg(src: 'layout' | 'page') {
  const isMobile = useMobileDetect()
  const isChat = isChatPage()

  const state = getStore('user')()
  const cfg = getStore('settings')()
  const chat = getStore('chat')((s) => ({ active: s.active }))
  const chars = getStore('character')((s) => ({ chatId: s.activeChatId, chars: s.chatChars }))

  const bg = createMemo(() => {
    if (src === 'page') return {}
    if (cfg.anonymize) return {}
    // if (src === 'layout' && isChat()) return {}

    const mobile = isMobile()

    const base: JSX.CSSProperties = {
      'background-repeat': 'no-repeat',
      'background-position': 'center',
      'background-color': isChat() ? undefined : '',
    }

    const isBg = state.ui.viewMode?.startsWith('background')
    const char = chars.chars.map[chat.active?.char?._id!]
    if (!isChat || !isBg || !char || char.visualType === 'sprite' || !char.avatar) {
      return {
        ...base,
        'background-image': state.background ? `url(${state.background})` : undefined,
        'background-size': 'cover',
      }
    }

    const size =
      state.ui.viewMode === 'background-contain'
        ? 'contain'
        : state.ui.viewMode === 'background-cover'
        ? 'cover'
        : mobile
        ? 'contain'
        : 'auto'
    return {
      ...base,
      'background-image': `url(${getAssetUrl(char.avatar)})`,
      'background-size': size,
    }
  })

  return bg
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

export function canUsePane() {
  return window.innerWidth >= PANE_BREAKPOINT
}

export function usePane() {
  const windowSize = useWindowSize()
  const isSmallScreen = createMemo(() => windowSize.width() < PANE_BREAKPOINT)
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

  const update = (pane?: string) => {
    setSearch({ pane })
  }

  return { showing, update, pane }
}

export function useBgStyle(props: { hex: string; opacity?: number; blur: boolean }) {
  const user = getStore('user')()

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
  const [size, setSize] = createSignal({ w: 0, h: 0, x: 0, y: 0 })
  const [loaded, setLoaded] = createSignal(false)
  const [platform, setPlatform] = createSignal<'sm' | 'lg' | 'xl'>()

  const [obs] = createSignal(
    new ResizeObserver((cb) => {
      const ele = cb[0]
      if (!ele) return
      const rect = ele.target.getBoundingClientRect()
      setSize({ w: ele.target.clientWidth, h: ele.target.clientHeight, x: rect.x, y: rect.y })
      setPlatform(getWidthPlatform(ele.target.clientWidth))
    })
  )

  const load = (ref: HTMLElement) => {
    if (!ref) return
    if (loaded()) return

    setLoaded(true)
    obs().observe(ref)
    const rect = ref.getBoundingClientRect()
    setSize({ w: ref.clientWidth, h: ref.clientHeight, x: rect.x, y: rect.y })
    setPlatform(getWidthPlatform(ref.clientWidth || 0))
  }

  onCleanup(() => {
    obs().disconnect()
  })

  return { size, load, loaded, platform }
}

export function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export function useMobileDetect() {
  const [mobile, setMobile] = createSignal(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

  useEffect(() => {
    const timer = setInterval(() => {
      const prev = mobile()
      const next = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (prev === next) return
      setMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, 2000)

    return () => clearInterval(timer)
  })

  return mobile
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
        setReady(true)
        clearInterval(timer)
      } else {
      }
    }, 500)

    return () => clearInterval(timer)
  })

  return ready
}
