import { Component, JSX, Match, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types'
import { settingStore, userStore } from '../store'
import { v4 } from 'uuid'
import { useResizeObserver } from './hooks'

type SlotKind = Exclude<keyof Required<AppSchema.AppConfig['slots']>, 'testing'>

const Slot: Component<{ slot: SlotKind; sticky?: boolean; parent?: HTMLElement; class?: string }> = (props) => {
  let ref: HTMLDivElement | undefined = undefined
  const user = userStore()

  const [show, setShow] = createSignal(false)
  const [stick, setStick] = createSignal(props.sticky)
  const [id] = createSignal(`${props.slot}-${v4().slice(0, 8)}`)
  const [done, setDone] = createSignal(false)

  const cfg = settingStore((s) => ({
    slots: s.config.slots,
    flags: s.flags,
    ready: s.initLoading === false,
  }))

  const size = useResizeObserver()

  const hidden = createMemo(() => (show() ? '' : 'hidden'))

  const log = (...args: any[]) => {
    if (!user.user?.admin) return
    console.log.apply(null, [`[${props.slot}]`, ...args, { show: show(), done: done() }])
  }

  createEffect(() => {
    if (!cfg.ready) return

    if (ref && !size.loaded()) {
      size.load(ref)
      const win: any = window
      win[props.slot] = size
    }

    /**
     * Display when slot is configured and any of:
     * 1. Feature flag is enabled
     * 2. or 'testing' is true and user is admin
     * 3. Env var is enabled
     */
    const hasSlot = !!cfg.slots[props.slot]
    if (!hasSlot) {
      log('Missing slot')
    }

    const canShow = hasSlot && (cfg.flags.slots || cfg.slots.enabled)
    setShow(canShow)
    const ele = document.getElementById(id()) || ref
    if (!ele) {
      log(props.slot, 'No element')
      return
    }

    if (canShow) {
      if (done()) {
        return
      }

      const node = document.createRange().createContextualFragment(cfg.slots[props.slot] as any)
      ele.append(node)

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
    } else {
      ele.innerHTML = ''
    }
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
            class={`w-full border-[1px] border-[var(--bg-700)] bg-[var(--text-200)] ${hidden()} ${props.class || ''}`}
            ref={ref}
            id={id()}
            data-slot={props.slot}
            style={style()}
          ></div>
        </Match>
        <Match when={!user.user?.admin}>
          <div id={id()} class={hidden()} ref={ref} data-slot={props.slot} style={style()}></div>
        </Match>
      </Switch>
    </>
  )
}

export default Slot
