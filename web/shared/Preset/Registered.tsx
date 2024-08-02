import { Component, createMemo, For, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { AIAdapter } from '../../../common/adapters'
import { settingStore } from '../../store'
import { ServiceOption } from '../../pages/Settings/components/RegisteredSettings'

export const RegisteredSettings: Component<{
  service?: AIAdapter
  inherit?: Partial<AppSchema.GenSettings>
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
              value={props.inherit?.registered?.[props.service!]?.[opt.field]}
            />
          )}
        </For>
      </div>
    </Show>
  )
}
