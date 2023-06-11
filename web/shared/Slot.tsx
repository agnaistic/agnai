import { Component, Show, createEffect, createSignal } from 'solid-js'
import { AppSchema } from '/srv/db/schema'
import { settingStore, userStore } from '../store'

type SlotKind = Exclude<keyof Required<AppSchema.AppConfig['slots']>, 'testing'>

const Slot: Component<{ slot: SlotKind }> = (props) => {
  let ref: any
  const [show, setShow] = createSignal(false)
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
    if (!ref) return

    if (canShow) {
      ref.innerHTML = cfg.slots[props.slot] || ''
    } else {
      ref.innerHTML = ''
    }
  })

  return (
    <Show when={show()}>
      <div
        data-testing={cfg.slots.testing}
        ref={ref}
        classList={{
          'border-[var(--bg-700)]': user.user?.admin && cfg.slots.testing,
          'border-[1px]': user.user?.admin && cfg.slots.testing,
        }}
      ></div>
    </Show>
  )
}

export default Slot
