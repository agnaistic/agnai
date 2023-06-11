import { Component, Show, createEffect, createSignal } from 'solid-js'
import { AppSchema } from '/srv/db/schema'
import { settingStore, userStore } from '../store'
import { v4 } from 'uuid'

type SlotKind = Exclude<keyof Required<AppSchema.AppConfig['slots']>, 'testing'>

const Slot: Component<{ slot: SlotKind }> = (props) => {
  const [show, setShow] = createSignal(false)

  const [id] = createSignal(v4())
  const [done, setDone] = createSignal(false)
  const cfg = settingStore((s) => ({ slots: s.config.slots, flags: s.flags }))
  const user = userStore()

  createEffect(() => {
    /**
     * Display when slot is configured and any of:
     * 1. Feature flag is enabled
     * 2. or 'testing' is true and user is admin
     * 3. Env var is enabled
     */
    const hasSlot = !!cfg.slots[props.slot]
    const isTesting = cfg.slots.testing ? !!user.user?.admin : false
    const canShow = hasSlot && (cfg.flags.slots || isTesting || cfg.slots.enabled)

    setShow(canShow)
    const ele = document.getElementById(id())
    if (!ele) return

    if (canShow) {
      if (done()) return
      const node = document.createRange().createContextualFragment(cfg.slots[props.slot] as any)
      ele.append(node)
      setDone(true)
    } else {
      ele.innerHTML = ''
    }
  })

  return (
    <Show when={show()}>
      <div
        id={id()}
        data-testing={cfg.slots.testing}
        classList={{
          'border-[var(--bg-700)]': user.user?.admin && cfg.slots.testing,
          'border-[1px]': user.user?.admin && cfg.slots.testing,
        }}
      ></div>
    </Show>
  )
}

export default Slot
