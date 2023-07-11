import { Component, JSX, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types'
import { settingStore, userStore } from '../store'
import { v4 } from 'uuid'

type SlotKind = Exclude<keyof Required<AppSchema.AppConfig['slots']>, 'testing'>

const Slot: Component<{ slot: SlotKind; sticky?: boolean; parent?: HTMLElement }> = (props) => {
  let ref: HTMLDivElement | undefined = undefined
  const user = userStore()

  const [show, setShow] = createSignal(false)
  const [stick, setStick] = createSignal(props.sticky)
  const [id] = createSignal(v4())
  const [done, setDone] = createSignal(false)

  const cfg = settingStore((s) => ({
    slots: s.config.slots,
    flags: s.flags,
    ready: s.initLoading === false,
  }))

  const hidden = createMemo(() => (show() ? '' : 'hidden'))

  const log = (...args: any[]) => {
    if (!user.user?.admin) return
    console.log.apply(null, [`[${props.slot}]`, ...args, { show: show(), done: done() }])
  }

  createEffect(() => {
    if (!cfg.ready) return

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
      <Show when={user.user?.admin}>
        <div
          class={`border-[1px] border-[var(--bg-700)] bg-[var(--text-200)] ${hidden()}`}
          ref={ref}
          id={id()}
          data-slot={props.slot}
          style={style()}
        ></div>
      </Show>
      <Show when={!user.user?.admin}>
        <div class={hidden()} ref={ref} id={id()} data-slot={props.slot} style={style()}></div>
      </Show>
    </>
  )
}

export default Slot
