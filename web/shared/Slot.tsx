import { Component, JSX, Match, Switch, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { SettingState, settingStore, userStore } from '../store'
import { v4 } from 'uuid'
import { useEffect, useResizeObserver, useWindowSize } from './hooks'

window.googletag = window.googletag || { cmd: [] }

type SlotId = Exclude<keyof SettingState['slots'], 'publisherId'>
type SlotKind = 'menu' | 'leaderboard' | 'content'
type SlotSize = 'sm' | 'lg' | 'xl'

type SlotSpec = { size: string; id: SlotId }
type SlotDef = { sm: SlotSpec; lg: SlotSpec; xl?: SlotSpec }

const Slot: Component<{ slot: SlotKind; sticky?: boolean; parent?: HTMLElement; class?: string; size?: SlotSize }> = (
  props
) => {
  let ref: HTMLDivElement | undefined = undefined
  const user = userStore()

  const page = useWindowSize()
  const [show, setShow] = createSignal(false)
  const [stick, setStick] = createSignal(props.sticky)
  const [id] = createSignal(`${props.slot}-${v4().slice(0, 8)}`)
  const [done, setDone] = createSignal(false)
  const [adslot, setSlot] = createSignal<googletag.Slot>()
  const [viewed, setViewed] = createSignal(false)
  const [_visible, setVisible] = createSignal(false)

  const cfg = settingStore((s) => ({
    publisherId: s.slots.publisherId,
    newSlots: s.slots,
    slotsLoaded: s.slotsLoaded,
    flags: s.flags,
    ready: s.initLoading === false,
  }))

  const resize = useResizeObserver()

  const refresh = () => {
    const slot = adslot()
    if (!slot) return
    if (!viewed()) return

    googletag.pubads().refresh([slot])
    log('Refreshed')
    setViewed(false)
  }

  useEffect(() => {
    const onLoaded = (evt: googletag.events.SlotOnloadEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
      log('Loaded')
    }

    const onView = (evt: googletag.events.ImpressionViewableEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return

      log('Viewable')
      setViewed(true)
      // TODO: Start refresh timer
    }

    const onVisChange = (evt: googletag.events.SlotVisibilityChangedEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
      log('Visibility', evt.inViewPercentage)
      setVisible(evt.inViewPercentage > 0)
    }

    const onRequested = (evt: googletag.events.SlotRequestedEvent) => {
      if (evt.slot.getSlotElementId() !== id()) return
      log('Requested')
    }

    const onResponse = (evt: googletag.events.SlotResponseReceived) => {
      if (evt.slot.getSlotElementId() !== id()) return
      log('Responded')
    }

    googletag.cmd.push(() => {
      googletag.pubads().addEventListener('impressionViewable', onView)
      googletag.pubads().addEventListener('slotVisibilityChanged', onVisChange)
      googletag.pubads().addEventListener('slotOnload', onLoaded)
      googletag.pubads().addEventListener('slotRequested', onRequested)
      googletag.pubads().addEventListener('slotResponseReceived', onResponse)
    })

    return () => {
      googletag.pubads().removeEventListener('impressionViewable', onView)
      googletag.pubads().removeEventListener('slotVisibilityChanged', onVisChange)
      googletag.pubads().removeEventListener('slotOnload', onLoaded)
      googletag.pubads().removeEventListener('slotRequested', onRequested)
      googletag.pubads().removeEventListener('slotResponseReceived', onResponse)
    }
  })

  onCleanup(() => {
    const remove = adslot()
    if (!remove) return
    log('Cleanup')
    googletag.destroySlots([remove])
  })

  const log = (...args: any[]) => {
    if (!user.user?.admin) return
    console.log.apply(null, [`[${id()}]`, ...args, { show: show(), done: done() }])
  }

  const specs = createMemo(() => {
    const def = sizes[props.slot]

    const platform = page.platform()

    switch (props.size || platform) {
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
  })

  createEffect(() => {
    if (!cfg.ready || !cfg.slotsLoaded || !cfg.publisherId) return

    if (ref && !resize.loaded()) {
      resize.load(ref)
      const win: any = window
      win[props.slot] = resize
    }

    setShow(true)

    const ele = document.getElementById(id()) || ref
    if (!ele) {
      log(props.slot, 'No element')
      return
    }

    if (done()) {
      return
    }

    const spec = specs()

    // const node = document.createRange().createContextualFragment(cfg.inner as any)
    // ele.append(node)

    googletag.cmd.push(function () {
      const slot = googletag.defineSlot(getSlotId(`/${cfg.publisherId}/${spec.id}`), [spec.wh], id())
      if (!slot) {
        log(`No slot created`)
        return
      }
      slot.addService(googletag.pubads())
      if (!user.user?.admin) {
        googletag.pubads().collapseEmptyDivs()
      }
      googletag.enableServices()
      setSlot(slot)
    })

    googletag.cmd.push(function () {
      if (adslot()) {
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
            class={`flex w-full justify-center border-[1px] border-[var(--bg-700)] bg-[var(--text-200)] ${
              props.class || ''
            }`}
            ref={ref}
            id={id()}
            data-slot={props.slot}
            style={{ ...style(), ...specs().css }}
          ></div>
        </Match>
        <Match when={!user.user?.admin}>
          <div id={id()} ref={ref} data-slot={props.slot} style={{ ...style(), ...specs().css }}></div>
        </Match>
      </Switch>
    </>
  )
}

export default Slot

const sizes: Record<SlotKind, SlotDef> = {
  leaderboard: {
    sm: { size: '320x50', id: 'agn-leaderboard-sm' },
    lg: { size: '728x90', id: 'agn-leaderboard-lg' },
    xl: { size: '970x90', id: 'agn-leaderboard-xl' },
  },
  menu: {
    sm: { size: '300x250', id: 'agn-menu-sm' },
    lg: { size: '300x600', id: 'agn-menu-lg' },
  },
  content: {
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

function getSlotById(id: string) {
  const slots = googletag.pubads().getSlots()

  for (const slot of slots) {
    const slotId = slot.getSlotElementId()
    if (slotId === id) return slot
  }
}

// googletag.cmd.push(function () {
//   googletag
//     .defineSlot(
//       '/22941075743/agn-menu',
//       [
//         [300, 600],
//         [300, 250],
//       ],
//       'div-gpt-ad-1689162987906-0'
//     )
//     .addService(googletag.pubads())
//   googletag.pubads().collapseEmptyDivs()
//   googletag.enableServices()
// })

// <!-- /22941075743/agn-withincontent -->
// <div id='div-gpt-ad-1689163019282-0' style='min-width: 320px; min-height: 50px;'>
//   <script>
//     googletag.cmd.push(function() { googletag.display('div-gpt-ad-1689163019282-0'); });
//   </script>
// </div>

function getSlotId(id: string) {
  if (location.origin.includes('localhost')) {
    return '/6499/example/banner'
  }

  return id
}
