import {
  Component,
  JSX,
  Match,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from 'solid-js'
import { SettingState, settingStore, userStore } from '../store'
import { getPagePlatform, getWidthPlatform, useEffect, useResizeObserver } from './hooks'
import { getUserSubscriptionTier, wait } from '/common/util'
import { createDebounce } from './util'

const win: any = window
win.enableSticky = JSON.parse(localStorage.getItem('agnai-sticky') || 'true')

window.googletag = window.googletag || { cmd: [] }
window.ezstandalone = window.ezstandalone || { cmd: [] }
window.fusetag = window.fusetag || { que: [] }

let slotCounter = 200

const idLocks = new Set<number>()

declare const google: { ima: any }

export type SlotSize = 'sm' | 'lg' | 'xl'
export type SlotKind =
  | 'menu'
  | 'leaderboard'
  | 'content'
  | 'video'
  | 'pane_leaderboard'
  | 'header'
  | 'rail_lhs'
  | 'rail_rhs'

type SlotId =
  | 'agn-header'
  | 'agn-menu-sm'
  | 'agn-menu-lg'
  | 'agn-rail-lhs'
  | 'agn-rail-rhs'
  | 'agn-leaderboard-sm'
  | 'agn-leaderboard-lg'
  | 'agn-leaderboard-xl'
  | 'agn-video-sm'

type SlotSpec = { size: string; id: SlotId; fallbacks?: string[]; fuseId: string }
type SlotDef = {
  calc?: (parent: HTMLElement) => SlotSize | null
  platform: 'page' | 'container'
  video?: boolean
  sm?: SlotSpec
  lg?: SlotSpec
  xl?: SlotSpec
  ez: number[]
}

const MIN_AGE = 60 * 1000
const VIDEO_AGE = 125 * 1000

const FuseIds = new Map<string, boolean>()

export function useCanSlot() {
  const cfg = settingStore((s) => {
    const parsed = tryParse<Partial<SettingState['slots']>>(s.config.serverConfig?.slots || '{}')
    return {
      ready: !s.slots.provider && s.slotsLoaded && s.initLoading === false,
      provider: s.slots.provider,
      publisherId: parsed.publisherId || s.slots.publisherId,
    }
  })

  const user = userStore((s) => ({
    sub: s.sub,
  }))

  const canSlot = createMemo(() => {
    if (cfg.provider === 'google' && !cfg.publisherId) return false
    return !!cfg.provider && !!cfg.ready && !user.sub?.tier.disableSlots
  })

  return canSlot
}

const Slot: Component<{
  slot: SlotKind
  sticky?: boolean | 'always'
  parent: HTMLElement | undefined
  size?: SlotSize
}> = (props) => {
  let ref: HTMLDivElement | undefined = undefined
  const cfg = settingStore((s) => {
    const parsed = tryParse<Partial<SettingState['slots']>>(s.config.serverConfig?.slots || '{}')
    const config = {
      provider: s.slots.provider,
      publisherId: parsed.publisherId || s.slots.publisherId,
      slots: Object.assign({}, s.slots) as SettingState['slots'],
      flags: s.flags,
      ready: !!s.slots.provider && s.slotsLoaded && s.initLoading === false,
      config: s.config.serverConfig,
    }
    return config
  })
  const user = userStore((s) => ({
    user: s.user,
    sub: s.sub,
    tiers: s.tiers,
  }))

  const [stick, setStick] = createSignal(props.sticky)
  const [uniqueId, setUniqueId] = createSignal<number>()

  const [done, setDone] = createSignal(false)
  const [adslot, setSlot] = createSignal<googletag.Slot>()
  const [viewable, setViewed] = createSignal<number>()
  const [visible, setVisible] = createSignal(false)
  const [slotId, setSlotId] = createSignal<string>()
  const [actualId, setActualId] = createSignal('...')

  createEffect(() => {
    if (!user.user) return
    const subtier = getUserSubscriptionTier(user.user, user.tiers)

    if (subtier?.tier.disableSlots) {
      win.enableSticky = undefined
      localStorage.setItem('agnai-sticky', 'false')
    }

    return subtier
  })

  const id = createMemo(() => {
    if (cfg.provider === 'ez') return `ezoic-pub-ad-placeholder-${uniqueId() || '###'}`
    if (cfg.provider === 'fuse') return `fuse-${uniqueId()}`
    return `${props.slot}-${uniqueId()}`
  })

  const log = (...args: any[]) => {
    if (cfg.provider === 'google' && !cfg.publisherId) {
      return
    }
    if (!cfg.flags.reporting) return
    let slotid = actualId()
    const now = new Date()
    const ts = `${now.toTimeString().slice(0, 8)}.${now.toISOString().slice(-4, -1)}`
    console.log.apply(null, [
      `${ts} [${cfg.provider || 'none'}|${uniqueId() || 'no id'}]`,
      ...args,
      `| ${slotid}`,
    ])
  }

  const resize = useResizeObserver()
  const parentSize = useResizeObserver()

  createEffect(
    on(
      () => props.parent,
      (parent) => {
        if (parent && !parentSize.loaded()) {
          parentSize.load(parent)
        }
      }
    )
  )

  if (props.parent && !parentSize.loaded()) {
    parentSize.load(props.parent)
  }

  const specs = createMemo(() => {
    const parent = props.parent
    const ready = cfg.ready
    if (!ready) return null

    if (!parent) {
      return
    }

    resize.size()
    props.parent?.clientWidth
    parentSize.size()
    const spec = getSpec(props.slot, parent, log)
    if (!spec) return null

    setActualId(spec.id)
    return spec
  })

  const tryRefresh = () => {
    const slot = adslot()
    const viewed = viewable()
    if (!slot || typeof viewed !== 'number') return

    const diff = Date.now() - viewed

    log('Trying', Math.round(diff / 1000))
    const minAge = specs()?.id.includes('agn-video') ? VIDEO_AGE : MIN_AGE
    const canRefresh = visible() && diff >= minAge

    if (canRefresh) {
      setViewed()
      googletag.cmd.push(() => {
        googletag.pubads().refresh([slot])
      })
      log('Refreshed')
    }
  }

  useEffect(() => {
    const refresher = setInterval(() => {
      tryRefresh()
    }, 15000)

    const onLoaded = (evt: googletag.events.SlotOnloadEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
    }

    const onView = (evt: googletag.events.ImpressionViewableEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return

      log('Viewable')
      setViewed(Date.now())
      // TODO: Start refresh timer
    }

    const onVisChange = (evt: googletag.events.SlotVisibilityChangedEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
      setVisible((prev) => {
        const next = evt.inViewPercentage >= 50
        if (!prev && next) {
          tryRefresh()
        }
        return next
      })
    }

    const onRequested = (evt: googletag.events.SlotRequestedEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
      log('Requested', slotId())
    }

    const onResponse = (evt: googletag.events.SlotResponseReceived) => {
      if (evt.slot.getSlotElementId() !== id()) return
    }

    gtmReady.then((status) => {
      if (!status) return

      googletag.cmd.push(() => {
        googletag.pubads().addEventListener('impressionViewable', onView)
        googletag.pubads().addEventListener('slotVisibilityChanged', onVisChange)
        googletag.pubads().addEventListener('slotOnload', onLoaded)
        googletag.pubads().addEventListener('slotRequested', onRequested)
        googletag.pubads().addEventListener('slotResponseReceived', onResponse)
      })
    })

    return () => {
      clearInterval(refresher)

      gtmReady.then((status) => {
        if (!status) return
        googletag.pubads().removeEventListener('impressionViewable', onView)
        googletag.pubads().removeEventListener('slotVisibilityChanged', onVisChange)
        googletag.pubads().removeEventListener('slotOnload', onLoaded)
        googletag.pubads().removeEventListener('slotRequested', onRequested)
        googletag.pubads().removeEventListener('slotResponseReceived', onResponse)
      })
    }
  })

  onCleanup(() => {
    idLocks.delete(uniqueId()!)
    FuseIds.delete(id())
    log('Cleanup')

    if (cfg.provider === 'ez') {
      if (!ezstandalone.getSelectedPlaceholders) return
      const id = uniqueId()
      const holders = ezstandalone.getSelectedPlaceholders()
      if (!done() || !ref || !holders[id!]) return
      ezstandalone.cmd.push(() => {
        ezstandalone.destroyPlaceholders(uniqueId()!)
      })
    } else {
      const remove = adslot()
      if (!remove) return
      googletag.destroySlots([remove])
    }
  })

  createEffect(async () => {
    if (!cfg.ready) {
      log('Not ready')
      return
    }

    if (!props.parent) {
      log('Not ready: Parent missing')
      return
    }

    if (cfg.provider === 'google' && !cfg.publisherId) {
      return log('No publisher id')
    }

    if (user.sub?.tier.disableSlots) {
      props.parent.style.display = 'hidden'
      return log('Slots are tier disabled')
    }

    if (!cfg.provider) {
      return log('No provider configured')
    }

    resize.size()

    if (ref && !resize.loaded()) {
      resize.load(ref)
      // log('Not loaded')
      return
    }

    if (done()) {
      return
    }

    const spec = specs()
    if (!spec) {
      log('No slot available')
      return
    }

    const num = uniqueId() || getUniqueId(props.slot, cfg.slots, uniqueId())
    setUniqueId(num)

    if (cfg.provider === 'ez') {
      invokeEz(log, num)
    } else if (cfg.provider === 'google') {
      gtmReady.then((status) => {
        if (!status) return

        googletag.cmd.push(function () {
          const slotId = getSlotId(`/${cfg.publisherId}/${spec.id}`)
          setSlotId(slotId)
          const slot = googletag.defineSlot(slotId, spec.wh, id())
          if (!slot) {
            log(`No slot created`)
            return
          }

          slot.addService(googletag.pubads())
          googletag.pubads().collapseEmptyDivs()
          googletag.pubads().enableVideoAds()

          googletag.enableServices()
          setSlot(slot)
        })

        googletag.cmd.push(function () {
          if (adslot()) {
            log('Displaying')
            googletag.display(id())
            googletag.pubads().refresh([adslot()!])
          }
        })
      })
    } else if (cfg.provider === 'fuse') {
      fuseReady.then((status) => {
        if (!status) return

        window.fusetag.registerZone(id())
        FuseIds.set(id(), false)
        invokeFuse()
      })
    }

    if (stick() && props.parent) {
      props.parent.classList.add('slot-sticky')
    }

    setDone(true)
    log('Rendered', !!props.parent)

    setTimeout(() => {
      if (props.sticky === 'always') return
      setStick(false)

      if (props.parent) {
        props.parent.classList.remove('slot-sticky')
      }
    }, 4500)
  })

  const style = createMemo<JSX.CSSProperties>(() => {
    if (!stick()) return {}

    return { position: 'sticky', top: '0' }
  })

  return (
    <>
      <Switch>
        <Match when={!cfg.ready || !user.user || !specs() || user.sub?.tier?.disableSlots}>
          {null}
        </Match>
        <Match when={specs()!.video && cfg.slots.gtmVideoTag}>
          <div
            id={id()}
            style={{
              ...style(),
              ...specs()!.css,
              position: 'relative',
            }}
            data-slot={specs()!.id}
            data-fuse={specs()!.fuseId}
          >
            <video
              id={`${id()}-player`}
              class="h-full w-full"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              muted
              crossorigin="anonymous"
            >
              <source src={cfg.slots.gtmVideoTag} />
            </video>
            <div
              id={`${id()}-ad`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
            />
          </div>
        </Match>
        <Match when={cfg.flags.reporting}>
          <div
            class={`flex w-full justify-center border-[var(--bg-700)] bg-[var(--text-200)]`}
            ref={ref}
            id={id()}
            data-slot={specs()!.id}
            data-fuse={specs()!.fuseId}
            style={{ ...style(), ...specs()!.css }}
          ></div>
        </Match>
        <Match when>
          <div
            class="flex w-full justify-center"
            ref={ref}
            id={id()}
            data-slot={specs()!.id}
            data-fuse={specs()!.fuseId}
            style={{ ...style(), ...specs()!.css }}
          ></div>
        </Match>
      </Switch>
    </>
  )
}

export default Slot

const slotDefs: Record<SlotKind, SlotDef> = {
  video: {
    platform: 'page',
    calc: (parent) => {
      const def = window.innerWidth > 1024 ? (window.innerHeight > 1010 ? 'xl' : 'lg') : 'sm'
      return def
    },
    video: true,
    sm: { size: '300x250', id: 'agn-menu-sm', fuseId: '' },
    lg: { size: '300x300', id: 'agn-video-sm', fuseId: '' },
    xl: { size: '300x600', id: 'agn-video-sm', fuseId: '' },
    ez: [],
  },
  leaderboard: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm', fuseId: '23194815330' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg', fuseId: '23194815330' },
    xl: { size: '970x90', id: 'agn-leaderboard-xl', fuseId: '23194815330' },
    ez: [110, 111],
  },
  menu: {
    calc: (parent) => {
      if (window.innerHeight >= 1280) return 'lg'
      return 'sm'
    },
    platform: 'page',
    sm: {
      size: '300x250',
      id: 'agn-menu-sm',
      fuseId: location.host === 'agnai.chat' ? '23195824742' : '23199579880', // 23199579880
    }, //
    lg: {
      size: '300x600',
      id: 'agn-menu-lg',
      fuseId: location.host === 'agnai.chat' ? '23195824742' : '23195824742',
    },
    ez: [106],
  },
  content: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm', fuseId: '23195816384' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg', fuseId: '23195816384' },
    xl: {
      size: '970x90',
      id: 'agn-leaderboard-xl',
      fuseId: '',
      fallbacks: ['970x66', '960x90', '950x90'],
    },
    ez: [112, 113, 114],
  },
  pane_leaderboard: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm', fuseId: '' },
    ez: [108, 109],
  },
  header: {
    platform: 'page',
    video: false,
    sm: { size: '320x250', id: 'agn-header', fuseId: '23194815330' },
    ez: [],
  },
  rail_lhs: {
    calc: (parent) => {
      if (window.innerHeight >= 1280) return 'lg'
      return 'sm'
    },
    platform: 'page',
    sm: { size: '300x250', id: 'agn-rail-lhs', fuseId: '23194836720' },
    lg: { size: '300x600', id: 'agn-rail-lhs', fuseId: '23194836720' },
    ez: [],
  },
  rail_rhs: {
    calc: (parent) => {
      if (window.innerHeight > 1280) return 'lg'
      return 'sm'
    },
    platform: 'page',
    sm: { size: '300x250', id: 'agn-rail-rhs', fuseId: '23195816390' },
    lg: { size: '300x600', id: 'agn-rail-rhs', fuseId: '23195816390' },
    ez: [],
  },
}

function toSize(size: string): [number, number] {
  const [w, h] = size.split('x')
  return [+w, +h]
}

function toPixels(size: string) {
  // const [w, h] = size.split('x')
  // return { width: `${+w + 2}px`, height: `${+h + 2}px` }
  return {}
}

win.getSlotById = getSlotById

export function getSlotById(id: string) {
  const slots = googletag.pubads().getSlots()

  for (const slot of slots) {
    const slotId = slot.getSlotElementId()
    if (slotId === id) return slot
  }
}

function getUniqueId(kind: SlotKind, config: SettingState['slots'], current?: number) {
  if (current) return current
  if (config.provider === 'google') {
    return ++slotCounter
  }

  if (config.provider === 'fuse') {
    return ++slotCounter
  }

  const available = slotDefs[kind]
  const inherit: number[] = Array.isArray(config[kind]?.ez) ? config[kind].ez : []
  const all = inherit.concat(available.ez).filter((v) => !isNaN(v))

  for (const id of all) {
    if (idLocks.has(id)) continue
    idLocks.add(id)
    return id
  }

  return ++slotCounter
}

function getSlotId(id: string) {
  if (location.origin.includes('localhost') || location.origin.includes('127.0.0.1')) {
    console.debug('Psuedo request', id)
    return id.includes('video') ? '/6499/example/native-video' : '/6499/example/banner'
  }

  return id
}

const STARTED = Date.now()

const gtmReady = new Promise(async (resolve, reject) => {
  do {
    if (typeof googletag.pubads === 'function') {
      return resolve(true)
    }

    if (Date.now() - STARTED > 10000) return resolve(false)
    await wait(0.05)
  } while (true)
})

const ezReady = new Promise(async (resolve, reject) => {
  do {
    if (typeof window.ezstandalone.enable !== 'function') {
      return resolve(true)
    }
    if (Date.now() - STARTED > 10000) return resolve(false)
    await wait(0.05)
  } while (true)
})

const fuseReady = new Promise(async (resolve, reject) => {
  do {
    if (typeof window.fusetag.pageInit === 'function') {
      console.log('[fuse] ready')
      return resolve(true)
    }

    if (Date.now() - STARTED > 10000) return resolve(false)

    await wait(0.05)
  } while (true)
})

function getSpec(slot: SlotKind, parent: HTMLElement, log: typeof console.log) {
  const def = slotDefs[slot]

  if (def.calc) {
    const platform = def.calc(parent)
    if (!platform) return null
    return getBestFit(def, platform)
  }

  if (def.platform === 'page') {
    const platform = getPagePlatform(window.innerWidth)
    return getBestFit(def, platform)
  }

  const width = parent.clientWidth
  // log('W/H', width, parent.clientHeight)
  const platform = getWidthPlatform(width)

  return getBestFit(def, platform)
}

type SlotFit = { css: JSX.CSSProperties; wh: Array<[number, number]>; video?: boolean } & SlotSpec

function getBestFit(def: SlotDef, desired: SlotSize): SlotFit | null {
  switch (desired) {
    case 'xl': {
      const spec = def.xl || def.lg || def.sm
      if (!spec) return null
      return {
        css: toPixels(spec.size),
        wh: getSizes(def.xl, def.lg, def.sm),
        ...spec,
        video: def.video,
      }
    }

    case 'lg': {
      const spec = def.lg || def.sm
      if (!spec) return null
      return { css: toPixels(spec.size), wh: getSizes(def.lg, def.sm), ...spec, video: def.video }
    }

    default: {
      const spec = def.sm
      if (!spec) return null
      return { css: toPixels(spec.size), wh: getSizes(def.sm), ...spec, video: def.video }
    }
  }
}

function getSizes(...specs: Array<SlotSpec | undefined>) {
  const sizes: Array<[number, number]> = []

  for (const spec of specs) {
    if (!spec) continue
    sizes.push(toSize(spec.size))
    if (spec.fallbacks) {
      for (const size of spec.fallbacks) {
        sizes.push(toSize(size))
      }
    }
  }

  return sizes
}

const [invokeEz] = createDebounce((log: (typeof console)['log'], self: number) => {
  ezReady.then((status) => {
    if (!status) return

    ezstandalone.cmd.push(() => {
      const current = ezstandalone.getSelectedPlaceholders()
      const adding = new Set<number>([self])

      for (const num of idLocks.values()) {
        if (!current[num]) {
          adding.add(num)
        }
      }

      const add = Array.from(adding.values())
      if (!ezstandalone.enabled) {
        ezstandalone.define(...add)
        log('[ez]', `dispatched #${add.join(', ')}`)
        ezstandalone.enable()
        ezstandalone.display()
      } else {
        log('[ez]', `dispatched #${add.join(', ')} (more)`)
        ezstandalone.displayMore(...add)
      }
    })
  })
}, 1000)

const [invokeFuse] = createDebounce(() => {
  fuseReady.then((status) => {
    if (!status) return
    const ids: string[] = []
    for (const [id, inited] of FuseIds.entries()) {
      if (inited) continue
      ids.push(id)
      FuseIds.set(id, true)
    }
    console.log(`[fuse] init ${ids}`)
    const win: any = window
    win.enableSticky = true
    localStorage.setItem('agnai-sticky', 'true')
    window.fusetag.que.push(() => {
      window.fusetag.pageInit({ blockingFuseIds: ids })
    })
  })
}, 1000)

function tryParse<T = any>(json: string) {
  if (!json) return {} as T

  try {
    const obj = JSON.parse(json)
    return obj as T
  } catch (ex) {
    return {} as T
  }
}
