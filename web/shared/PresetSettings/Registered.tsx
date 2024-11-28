import { Component, createMemo, For, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { AIAdapter } from '../../../common/adapters'
import { settingStore } from '../../store'
import { ServiceOption } from '../../pages/Settings/components/RegisteredSettings'
import { SetStoreFunction } from 'solid-js/store'

export const RegisteredSettings: Component<{
  service?: AIAdapter
  state?: Partial<AppSchema.GenSettings>
  setter?: SetStoreFunction<AppSchema.GenSettings>
  mode: AppSchema.GenSettings['presetMode']
}> = (props) => {
  const state = settingStore()

  const options = createMemo(() => {
    if (!props.service) return []

    const svc = state.config.registered.find((reg) => reg.name === props.service)
    if (!svc) return []

    return svc.settings.filter((s) => s.preset)
  })

  return (
    <Show when={options().length}>
      <div class="mt-2 flex flex-col gap-2">
        <For each={options()}>
          {(opt) => (
            <ServiceOption
              opt={opt}
              service={props.service!}
              field={(field) => `registered.${props.service!}.${field}`}
              value={props.state?.registered?.[props.service!]?.[opt.field]}
              hide={props.mode === 'simple' && opt.advanced === false}
              onChange={(ev) => {
                if (!props.setter || !props.state) return
                if (!props.state.service) return
                const prev = { ...(props.state.registered as any)?.[props.state.service!] }
                prev[opt.field] = ev
                const next = { ...props.state.registered, [props.state.service]: prev }
                props.setter('registered', next)
              }}
            />
          )}
        </For>
      </div>
    </Show>
  )
}
