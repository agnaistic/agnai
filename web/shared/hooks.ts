import {
  Accessor,
  JSX,
  Signal,
  createEffect,
  createMemo,
  createResource,
  on,
  onCleanup,
  onMount,
} from 'solid-js'
import { createSignal, createRenderEffect } from 'solid-js'
import { useLocation, useSearchParams } from '@solidjs/router'
import { createImageCache } from '../store/images'
import { createStore } from 'solid-js/store'
import { getSettingColor, hexToRgb } from './colors'
import { getAssetUrl, storage } from './util'
import { AutoPreset, getPresetOptions } from './adapter'
import { ADAPTER_LABELS } from '/common/adapters'
import { getStore } from '../store/create'
import { clamp, inline, tryParse } from '/common/util'
import { debug } from '/common/debug'

const PANE_BREAKPOINT = 1280

export function getPlatform() {
  return window.innerWidth >= 1280 ? 'xl' : window.innerWidth > 720 ? 'lg' : 'sm'
}

export function usePresetOptions() {
  const presets = getStore('presets')((s) => s.presets)
  const user = getStore('user')((s) => ({ user: s.user }))

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
  id?: string
  initial?: number
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

export function isChatPageMemo(noSaga?: boolean) {
  const location = useLocation()
  const isChat = createMemo(() => {
    if (noSaga) {
      return location.pathname.startsWith('/chat/')
    }

    return location.pathname.startsWith('/chat/') || location.pathname.startsWith('/saga/')
  })

  return isChat
}

export function isChatPage() {
  return location.pathname.startsWith('/chat/')
}

export function useCharacterBg(src: 'layout' | 'page') {
  const isMobile = useMobileDetect()
  const isChat = isChatPageMemo()

  const state = getStore('user')((s) => ({ ui: s.ui, background: s.background }))
  const cfg = getStore('settings')((s) => ({ anonymize: s.anonymize }))
  const chat = getStore('chat')((s) => ({
    lastChatId: s.lastChatId,
    active: s.details[s.lastChatId || 'unknown'],
  }))
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

    const chatImage = chat.active?.chat.background
      ? chat.active.chat.background
      : isBg
      ? char?.avatar
      : undefined

    if (isChat() && chat.active?.chat.background) {
      const cfg = chat.active.chat.localSettings || {}
      const size =
        cfg.bgFormat === 'contain'
          ? 'contain'
          : cfg.bgFormat === 'cover'
          ? 'cover'
          : mobile
          ? 'contain'
          : 'auto'

      return {
        ...base,
        'background-image': `url(${getAssetUrl(chat.active?.chat.background)})`,
        'background-size': size,
      }
    } else if (isChat() && chatImage) {
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
        'background-image': `url(${getAssetUrl(chatImage)})`,
        'background-size': size,
      }
    }

    if (!isBg || !char || char.visualType === 'sprite') {
      return {
        ...base,
        'background-image': state.background ? `url(${state.background})` : undefined,
        'background-size': 'cover',
      }
    }

    return { ...base }
  })

  return bg
}

export type ImageCacheHook = ReturnType<typeof useImageCache>

export function useImageCache(opts: ImageCacheOpts = {}) {
  const [collection, setCollection] = createSignal<{ id: string; pos: number } | undefined>(
    opts.id ? { id: opts.id, pos: opts.initial ?? 0 } : undefined
  )
  const log = debug('use-cache')
  const reel = createImageCache('')

  const cleanIds = (imageId: string) => imageId.replace(`${collection}-`, '')

  const [state, setState] = createStore({
    image: '',
    pos: 0,
    imageId: '',
    images: [] as string[],
  })

  const [data] = createResource(collection, async (col, { refetching }) => {
    log('loading, refetch: %s', refetching)
    if (refetching) {
      // Skip any loading if the collection id is unchanged
      if (reel.id === col.id) return
    }
    reel.id = col.id

    if (opts.clean) {
      await reel.removeAll()
    }

    const imageIds = await reel.getImageIds()
    const images = imageIds.map(cleanIds)

    const current = clamp(col.pos !== undefined ? col.pos : images.length - 1, images.length - 1, 0)

    const image = await reel.getImage(images[current])
    setState({ pos: current, image, images, imageId: images[current] })
  })

  const load = async (collectionId: string, initial?: number) => {
    log('loading %s', collectionId)
    setCollection({ id: collectionId, pos: initial ?? 0 })
    // if (collectionId) {
    //   // Already loaded
    //   if (collectionId === reel.id) {
    //     return
    //   }
    //   setState('id', collectionId)
    //   reel.id = collectionId
    // }
    // const images = await reel.getImageIds()
    // setState({ images })
    // await pos(initial ?? 0)
  }

  const pos = async (position: number) => {
    if (position >= state.images.length) {
      position = 0
    } else if (position < 0) {
      position = state.images.length - 1
    }

    const image = await reel.getImage(state.images[position])
    console.log(`[reel] loading #${position}, valid: ${!!image}`)
    setState({ pos: position, image, imageId: state.images[position] })
  }

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

  const addImage = async (base64: string, meta?: { id?: string; prompt?: string }) => {
    const result = await reel.addImage(base64, meta)

    setState({
      images: result.ids.map(cleanIds),
      pos: result.ids.length - 1,
      imageId: result.ids[result.ids.length - 1],
      image: base64,
    })

    return result
  }

  const removeImage = async (imageId: string) => {
    const images = await reel.removeImage(imageId)

    // Automatically load the deleted image's ancestor if it is available
    if (imageId === state.imageId) {
      if (state.images.length === 1) {
        setState({ images: [], imageId: '', image: '', pos: 0 })
        return -1
      }

      let nextPos = -1
      if (images[state.pos]) {
        nextPos = state.pos
      } else if (state.pos > 0 && images[state.pos - 1]) {
        nextPos = state.pos - 1
      } else if (images[0]) {
        nextPos = 0
      }

      if (nextPos >= 0) {
        const image = await reel.getImage(images[nextPos])
        setState({ images: images.map(cleanIds), image, pos: nextPos, imageId: images[nextPos] })
      } else {
        setState({ images: images.map(cleanIds), pos: 0, image: '', imageId: '' })
      }

      return nextPos
    }

    setState({ images: images.map(cleanIds) })
  }

  return {
    state,
    load,
    position: pos,
    next,
    prev,
    addImage,
    removeImage,
    data,
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

export function createCachedStore<T extends Record<string, any>>(id: string, initialValue?: T) {
  const init = getStoredValue(id, initialValue || {})

  const [store, setStore] = createStore<T>(init)

  createEffect(
    on(
      () => ({ ...store }),
      (next) => {
        console.log(`[store:${id}] updated ${inline(next)}`)
        setStoredValue(id, next)
      }
    )
  )

  return [store, setStore] as const
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

export function useAsyncStorage<T = any>(id: string, initialValue: T) {
  const [value, setValue] = createSignal<T>()

  createEffect(async () => {
    const next = await storage.getItem(id)
    if (!next) {
      await update(initialValue)
      setValue(() => initialValue)
      return
    }

    setValue(() => JSON.parse(next))
  })

  const update = async (value: T) => {
    await storage.setItem(id, JSON.stringify(value))
  }

  return [value, update]
}

export function getStoredValue<T = any>(id: string, initialValue: T) {
  const key = `agnaistic-ls-${id}`
  const init = localStorage.getItem(key) || JSON.stringify(initialValue)
  const value = tryParse(init) ?? initialValue
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

  createEffect(
    on(
      () => search.pane,
      () => {
        const next = search.pane !== undefined && typeof search.pane === 'string'
        setShowing(next)
        setPane(search.pane)
      }
    )
  )

  const update = (pane?: string) => {
    setSearch({ pane })
  }

  return { showing, update, pane }
}

export function useBgStyle(props: { hex: string; opacity?: number; blur: boolean }) {
  const user = getStore('user')((s) => ({ ui: s.ui }))

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

  onMount(() => {
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
