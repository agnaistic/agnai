import { Component, For, Match, Switch, createMemo } from 'solid-js'
import { AdapterSetting, RegisteredAdapter } from '/common/adapters'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import Select from '/web/shared/Select'
import { userStore } from '/web/store'

const RegisteredSettings: Component<{ service: RegisteredAdapter }> = (props) => {
  const user = userStore((s) => s.user?.adapterConfig)

  return (
    <>
      <For each={props.service.settings}>
        {(each) => (
          <ServiceOption
            service={props.service.name}
            opt={each}
            value={user?.[props.service.name]?.[each.field]}
            config={user?.[props.service.name]}
          />
        )}
      </For>
    </>
  )
}

export default RegisteredSettings

const ServiceOption: Component<{
  service: string
  opt: AdapterSetting
  value?: any
  config?: Record<string, any>
}> = (props) => {
  const field = createMemo(() => `adapterConfig.${props.service}.${props.opt.field}`)
  const options = createMemo(() =>
    props.opt.setting.type === 'list' ? props.opt.setting.options : []
  )
  const placeholder = createMemo(() => {
    if (props.opt.setting.type !== 'text') return

    if (props.opt.secret) {
      const prop = `${props.opt.field}Set`
      const isSet = props.config?.[prop]

      if (isSet) return `Secret is set`
    }

    return props.opt.setting.placeholder
  })

  return (
    <Switch>
      <Match when={props.opt.setting.type === 'text'}>
        <TextInput
          fieldName={field()}
          label={props.opt.label}
          helperText={props.opt.helperText}
          type={props.opt.secret ? 'password' : undefined}
          placeholder={placeholder()}
          value={props.value}
        />
      </Match>

      <Match when={props.opt.setting.type === 'boolean'}>
        <Toggle
          fieldName={field()}
          label={props.opt.label}
          helperText={props.opt.helperText}
          value={props.value}
        />
      </Match>

      <Match when={props.opt.setting.type === 'list'}>
        <Select
          fieldName={field()}
          label={props.opt.label}
          helperText={props.opt.helperText}
          items={options()}
          value={props.value}
        />
      </Match>
    </Switch>
  )
}
