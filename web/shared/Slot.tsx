import { Component, JSX, Match, Switch, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import { SettingState, settingStore, userStore } from '../store'
import { v4 } from 'uuid'
import { getWidthPlatform, useEffect, useResizeObserver } from './hooks'
import { wait } from '/common/util'

window.googletag = window.googletag || { cmd: [] }

export type SlotKind = 'menu' | 'leaderboard' | 'content'
export type SlotSize = 'sm' | 'lg' | 'xl'

type SlotId = Exclude<keyof SettingState['slots'], 'publisherId'>

type SlotSpec = { size: string; id: SlotId }
type SlotDef = { platform: 'page' | 'container'; sm: SlotSpec; lg: SlotSpec; xl?: SlotSpec }

const Slot: Component<{ slot: SlotKind; sticky?: boolean; parent: HTMLElement }> = (props) => {
  let ref: HTMLDivElement | undefined = undefined
  const user = userStore()

  const [show, setShow] = createSignal(false)
  const [stick, setStick] = createSignal(props.sticky)
  const [id] = createSignal(`${props.slot}-${v4().slice(0, 8)}`)
  const [done, setDone] = createSignal(false)
  const [adslot, setSlot] = createSignal<googletag.Slot>()
  const [viewed, setViewed] = createSignal<number>()
  const [visible, setVisible] = createSignal(false)
  const [slotId, setSlotId] = createSignal<string>()

  const cfg = settingStore((s) => ({
    publisherId: s.slots.publisherId,
    newSlots: s.slots,
    slotsLoaded: s.slotsLoaded,
    flags: s.flags,
    ready: s.initLoading === false,
  }))

  const log = (...args: any[]) => {
    if (!cfg.publisherId) return
    if (!user.user?.admin && !cfg.flags.reporting) return
    console.log.apply(null, [`[${id()}]`, ...args, { show: show(), done: done() }])
  }

  const resize = useResizeObserver()
  const parentSize = useResizeObserver()

  if (props.parent && !parentSize.loaded()) {
    parentSize.load(props.parent)
    log('Parent loaded')
  }

  useEffect(() => {
    const refresher = setInterval(() => {
      const slot = adslot()
      const last = viewed()
      if (!slot || typeof last !== 'number') return

      const diff = Date.now() - last
      const canRefresh = visible() && diff >= 60000

      if (canRefresh) {
        setViewed()
        googletag.cmd.push(() => {
          googletag.pubads().refresh([slot])
        })
        log('Refreshed')
      }
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
      log('Visibility', evt.inViewPercentage)
      setVisible(evt.inViewPercentage > 0)
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

  const specs = createMemo(() => {
    const spec = getSpec(props.slot, props.parent, log)
    return spec
  })

  createEffect(async () => {
    await gtmReady
    if (!cfg.ready || !cfg.slotsLoaded || !cfg.publisherId || parentSize.size().w === 0) return

    if (ref && !resize.loaded()) {
      resize.load(ref)
    }

    if (resize.size().w === 0) {
      log('Skipped: Size 0')
      return
    } else {
      log('Okay:', resize.size().w)
    }

    setShow(true)

    if (done()) {
      return
    }

    const spec = specs()

    // const node = document.createRange().createContextualFragment(cfg.inner as any)
    // ele.append(node)

    googletag.cmd.push(function () {
      const slotId = getSlotId(`/${cfg.publisherId}/${spec.id}`)
      setSlotId(slotId)
      const slot = googletag.defineSlot(slotId, [spec.wh], id())
      if (!slot) {
        log(`No slot created`)
        return
      }

      slot.addService(googletag.pubads())
      if (!user.user?.admin) {
      }

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

    if (stick() && props.parent) {
      props.parent.classList.add('slot-sticky')
    }

    setDone(true)
    log('Rendered')

    setTimeout(() => {
      setStick(false)

      if (props.parent) {
        props.parent.classList.remove('slot-sticky')
      }
    }, 4500)
  })

  const style = createMemo<JSX.CSSProperties>(() => {
    if (!stick()) return {}

    return { position: 'sticky', top: '0', 'z-index': 10 }
  })

  return (
    <>
      <Switch>
        <Match when={!user.user}>{null}</Match>
        <Match when={user.user?.admin}>
          <div
            class={`flex w-full justify-center border-[var(--bg-700)] bg-[var(--text-200)]`}
            ref={ref}
            id={id()}
            data-slot={specs().id}
            style={{ ...style(), ...specs().css }}
          ></div>
        </Match>
        <Match when>
          <div
            class="flex w-full justify-center"
            id={id()}
            ref={ref}
            data-slot={specs().id}
            style={{ ...style(), ...specs().css }}
          ></div>
        </Match>
      </Switch>
    </>
  )
}

export default Slot

const sizes: Record<SlotKind, SlotDef> = {
  leaderboard: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg' },
    xl: { size: '970x90', id: 'agn-leaderboard-xl' },
  },
  menu: {
    platform: 'page',
    sm: { size: '300x250', id: 'agn-menu-sm' },
    lg: { size: '300x600', id: 'agn-menu-lg' },
  },
  content: {
    platform: 'container',
    sm: { size: '320x50', id: 'agn-leaderboard-sm' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg' },
  },
}

function toSize(size: string): [number, number] {
  const [w, h] = size.split('x')
  return [+w, +h]
}

function toPixels(size: string) {
  const [w, h] = size.split('x')
  return { width: `${w}px`, height: `${h}px` }
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
  return id
  if (location.origin.includes('localhost')) {
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
  const def = sizes[slot]

  if (def.platform === 'page') {
    const platform = getWidthPlatform(window.innerWidth)
    return getBestFit(def, platform)
  }

  const width = parent.clientWidth
  log('Spec width', width)
  const platform = getWidthPlatform(width)

  return getBestFit(def, platform)
}

function getBestFit(def: SlotDef, desired: SlotSize) {
  switch (desired) {
    case 'xl': {
      const spec = def.xl || def.lg || def.sm
      return { css: toPixels(spec.size), wh: toSize(spec.size), ...spec }
    }

    case 'lg': {
      const spec = def.lg || def.sm
      return { css: toPixels(spec.size), wh: toSize(spec.size), ...spec }
    }

    default: {
      const spec = def.sm
      return { css: toPixels(spec.size), wh: toSize(spec.size), ...spec }
    }
  }
}
