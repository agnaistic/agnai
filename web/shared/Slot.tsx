import {
  Component,
  JSX,
  Match,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js'
import { settingStore, userStore } from '../store'
import { v4 } from 'uuid'
import { getPagePlatform, getWidthPlatform, useEffect, useResizeObserver } from './hooks'
import { wait } from '/common/util'

window.googletag = window.googletag || { cmd: [] }

export type SlotKind = 'menu' | 'leaderboard' | 'content' | 'video'
export type SlotSize = 'sm' | 'lg' | 'xl'

type SlotId =
  | 'agn-menu-sm'
  | 'agn-menu-lg'
  | 'agn-leaderboard-sm'
  | 'agn-leaderboard-lg'
  | 'agn-leaderboard-xl'
  | 'agn-video'

type SlotSpec = { size: string; id: SlotId; fallbacks?: string[] }
type SlotDef = {
  calc?: (parent: HTMLElement) => SlotSize | null
  platform: 'page' | 'container'
  sm?: SlotSpec
  lg?: SlotSpec
  xl?: SlotSpec
}

const MIN_AGE = 60000

const Slot: Component<{
  slot: SlotKind
  sticky?: boolean | 'always'
  parent: HTMLElement
  size?: SlotSize
}> = (props) => {
  let ref: HTMLDivElement | undefined = undefined
  const user = userStore()
  const [stick, setStick] = createSignal(props.sticky)
  const [id] = createSignal(`${props.slot}-${v4().slice(0, 8)}`)
  const [done, setDone] = createSignal(false)
  const [adslot, setSlot] = createSignal<googletag.Slot>()
  const [viewable, setViewed] = createSignal<number>()
  const [visible, setVisible] = createSignal(false)
  const [slotId, setSlotId] = createSignal<string>()
  const [actualId, setActualId] = createSignal('...')

  const cfg = settingStore((s) => ({
    publisherId: s.slots.publisherId,
    newSlots: s.slots,
    slotsLoaded: s.slotsLoaded,
    flags: s.flags,
    ready: s.initLoading === false,
  }))

  const log = (...args: any[]) => {
    if (!cfg.publisherId) return
    if (!cfg.flags.reporting) return
    let slotid = actualId()
    console.log.apply(null, [`[${id()}]`, ...args, `| ${slotid}`])
  }

  const resize = useResizeObserver()
  const parentSize = useResizeObserver()

  if (props.parent && !parentSize.loaded()) {
    parentSize.load(props.parent)
  }

  const specs = createMemo(() => {
    resize.size()
    props.parent?.clientWidth
    parentSize.size()
    const spec = getSpec(props.slot, props.parent, log)
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
    const canRefresh = visible() && diff >= MIN_AGE

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

    gtmReady.then(() => {
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

      gtmReady.then(() => {
        googletag.pubads().removeEventListener('impressionViewable', onView)
        googletag.pubads().removeEventListener('slotVisibilityChanged', onVisChange)
        googletag.pubads().removeEventListener('slotOnload', onLoaded)
        googletag.pubads().removeEventListener('slotRequested', onRequested)
        googletag.pubads().removeEventListener('slotResponseReceived', onResponse)
      })
    }
  })

  onCleanup(() => {
    const remove = adslot()
    if (!remove) return
    log('Cleanup')
    googletag.destroySlots([remove])
  })

  createEffect(async () => {
    if (!cfg.ready) {
      log('Not ready')
      return
    }

    if (!cfg.slotsLoaded) {
      return log('Slot not ready')
    }

    if (!cfg.publisherId) {
      return log('No publisher id')
    }

    resize.size()

    if (ref && !resize.loaded()) {
      resize.load(ref)
      log('Not loaded')
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

    gtmReady.then(() => {
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
        // googletag.pubads().enableVideoAds()
        // if (!user.user?.admin) {
        // }

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

    if (stick() && props.parent) {
      props.parent.classList.add('slot-sticky')
    }

    setDone(true)
    log('Rendered')

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
        <Match when={!user.user || !specs()}>{null}</Match>
        <Match when={cfg.flags.reporting}>
          <div
            class={`flex w-full justify-center border-[var(--bg-700)] bg-[var(--text-200)]`}
            ref={ref}
            id={id()}
            data-slot={specs()!.id}
            style={{ ...style(), ...specs()!.css }}
          ></div>
        </Match>
        <Match when>
          <div
            class="flex w-full justify-center"
            ref={ref}
            id={id()}
            data-slot={specs()!.id}
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
    calc: (parent) => (window.innerWidth > 1024 ? 'sm' : null),
    sm: { size: '300x400', id: 'agn-video' },
  },
  leaderboard: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg' },
    xl: { size: '970x90', id: 'agn-leaderboard-xl' },
  },
  menu: {
    calc: (parent) => {
      if (window.innerHeight > 1010) return 'lg'
      return 'sm'
    },
    platform: 'page',
    sm: { size: '300x250', id: 'agn-menu-sm' },
    lg: { size: '300x600', id: 'agn-menu-lg' },
  },
  content: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg' },
    xl: { size: '970x90', id: 'agn-leaderboard-xl', fallbacks: ['970x66', '960x90', '950x90'] },
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

const win: any = window
win.getSlotById = getSlotById

export function getSlotById(id: string) {
  const slots = googletag.pubads().getSlots()

  for (const slot of slots) {
    const slotId = slot.getSlotElementId()
    if (slotId === id) return slot
  }
}

function getSlotId(id: string) {
  if (location.origin.includes('localhost') || location.origin.includes('127.0.0.1')) {
    console.debug('Psuedo request', id)
    return '/6499/example/banner'
  }

  return id
}

const gtmReady = new Promise(async (resolve) => {
  do {
    if (typeof googletag.pubads === 'function') {
      return resolve(true)
    }
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
  log('W/H', width, parent.clientHeight)
  const platform = getWidthPlatform(width)

  return getBestFit(def, platform)
}

type SlotFit = { css: JSX.CSSProperties; wh: Array<[number, number]> } & SlotSpec

function getBestFit(def: SlotDef, desired: SlotSize): SlotFit | null {
  switch (desired) {
    case 'xl': {
      const spec = def.xl || def.lg || def.sm
      if (!spec) return null
      return { css: toPixels(spec.size), wh: getSizes(def.xl, def.lg, def.sm), ...spec }
    }

    case 'lg': {
      const spec = def.lg || def.sm
      if (!spec) return null
      return { css: toPixels(spec.size), wh: getSizes(def.lg, def.sm), ...spec }
    }

    default: {
      const spec = def.sm
      if (!spec) return null
      return { css: toPixels(spec.size), wh: getSizes(def.sm), ...spec }
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
