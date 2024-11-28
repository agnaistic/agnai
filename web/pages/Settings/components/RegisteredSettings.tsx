import { Component, For, Match, Show, Switch, createMemo } from 'solid-js'
import { AIAdapter, AdapterSetting, RegisteredAdapter } from '/common/adapters'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import Select from '/web/shared/Select'
import { userStore } from '/web/store'
import { AppSchema } from '/common/types/index'
import { SetStoreFunction } from 'solid-js/store'

const RegisteredSettings: Component<{
  service: RegisteredAdapter
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <For each={props.service.settings}>
        {(each) => (
          <Show when={!each.hidden}>
            <ServiceOption
              service={props.service.name}
              opt={each}
              value={props.state.adapterConfig?.[props.service.name]?.[each.field]}
              config={props.state.adapterConfig?.[props.service.name]}
              onChange={(ev) => {
                const prev = { ...(props.state.adapterConfig as any)?.[props.service.name] }
                prev[each.field] = ev
                const next = { ...props.state.adapterConfig, [props.service.name]: prev }
                props.setter({ adapterConfig: next })
              }}
            />
          </Show>
        )}
      </For>
    </>
  )
}

export default RegisteredSettings

export const ServiceOption: Component<{
  service: string
  opt: AdapterSetting
  value?: any
  config?: Record<string, any>
  field?: (field: string) => string
  onChange?: (value: any) => void
  hide?: boolean
}> = (props) => {
  const field = createMemo(
    () => props.field?.(props.opt.field) || `adapterConfig.${props.service}.${props.opt.field}`
  )
  const options = createMemo(() => {
    const opts = props.opt.setting.type === 'list' ? props.opt.setting.options : []
    return opts
  })

  const isSet = createMemo(() => {
    const prop = `${props.opt.field}Set`
    return props.config?.[prop]
  })

  const placeholder = createMemo(() => {
    if (props.opt.setting.type !== 'text') return

    if (props.opt.secret) {
      if (isSet()) return `Secret is set`
    }

    return props.opt.setting.placeholder
  })

  const clearSecret = () => {
    userStore.updateService(props.service as AIAdapter, { [props.opt.field]: '' })
  }

  return (
    <Switch>
      <Match when={props.opt.setting.type === 'text'}>
        <TextInput
          fieldName={field()}
          label={props.opt.label}
          helperText={
            <>
              <span>{props.opt.helperText}</span>
              <Show when={isSet()}>
                <div>
                  <a class="link" onClick={clearSecret}>
                    Clear secret
                  </a>
                </div>
              </Show>
            </>
          }
          type={props.opt.secret ? 'password' : undefined}
          placeholder={placeholder()}
          value={props.value}
          onChange={(ev) => props.onChange?.(ev.currentTarget.value)}
          hide={props.hide}
        />
      </Match>

      <Match when={props.opt.setting.type === 'boolean'}>
        <Toggle
          fieldName={field()}
          label={props.opt.label}
          helperText={props.opt.helperText}
          value={!!props.value}
          onChange={props.onChange}
          hide={props.hide}
        />
      </Match>

      <Match when={props.opt.setting.type === 'list'}>
        <Select
          fieldName={field()}
          label={props.opt.label}
          helperText={props.opt.helperText}
          items={options()}
          value={props.value}
          onChange={(opt) => props.onChange?.(opt.value)}
          hide={props.hide}
        />
      </Match>
    </Switch>
  )
}
