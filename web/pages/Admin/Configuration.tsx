import { Component, For, Signal, createSignal } from 'solid-js'
import { adminStore, settingStore, userStore } from '/web/store'
import { useNavigate } from '@solidjs/router'
import PageHeader from '/web/shared/PageHeader'
import { Toggle } from '/web/shared/Toggle'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { FieldUpdater, getStrictForm, useRowHelper } from '/web/shared/util'
import { SaveIcon } from 'lucide-solid'
import Button from '/web/shared/Button'
import Divider from '/web/shared/Divider'

export { ServerConfiguration as default }

const ServerConfiguration: Component = () => {
  let form: HTMLFormElement
  const user = userStore()
  const nav = useNavigate()
  const state = settingStore((s) => s.config)

  const [slots, setSlots] = createSignal(state.serverConfig?.slots || '{}')

  if (!user.user?.admin) {
    nav('/')
    return null
  }

  const formatSlots = (ev: FormEvent) => {
    try {
      const obj = JSON.parse(ev.currentTarget.value || '{}')
      setSlots(JSON.stringify(obj, null, 2))
    } catch (ex) {}
  }

  const models = createSignal(
    Array.isArray(state.serverConfig?.imagesModels) ? state.serverConfig.imagesModels : []
  )

  const submit = () => {
    const body = getStrictForm(form, {
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      termsOfService: 'string',
      privacyStatement: 'string',
      policiesEnabled: 'boolean',
      imagesHost: 'string',
      imagesEnabled: 'boolean',
      supportEmail: 'string',
    })

    adminStore.updateServerConfig({
      ...body,
      slots: slots(),
      imagesModels: models[0](),
      enabledAdapters: [],
    })
  }

  return (
    <>
      <PageHeader title="Server Configuration" />

      <form ref={form!} class="flex flex-col gap-2" onSubmit={(ev) => ev.preventDefault()}>
        <Select
          fieldName="apiAccess"
          label="API Access Level"
          items={[
            { label: 'Off', value: 'off' },
            { label: 'All Users', value: 'users' },
            { label: 'Subscribers', value: 'subscribers' },
            { label: 'Adminstrators', value: 'admins' },
          ]}
          value={state.serverConfig?.apiAccess || 'off'}
        />

        <TextInput
          fieldName="imagesHost"
          label={
            <>
              <div class="flex gap-2">
                <div>Agnaistic Images Host</div>
                <Toggle fieldName="imagesEnabled" value={state.serverConfig?.imagesEnabled} />
              </div>
            </>
          }
          value={state.serverConfig?.imagesHost}
          classList={{ hidden: !state.adapters.includes('agnaistic') }}
        />

        <TextInput
          fieldName="supportEmail"
          label="Support Email"
          helperText="If provided, a link to this email will be added to the main navigation"
          value={state.serverConfig?.supportEmail}
        />

        <ImageModels signal={models} />

        <Toggle
          fieldName="maintenance"
          label="Maintenace Mode Enabled"
          helperText="Caution: If your database is no available, this flag will not work. Use the environment variable instead."
          value={state.serverConfig?.maintenance}
        />

        <TextInput
          fieldName="maintenanceMessage"
          isMultiline
          label="Maintenance Message"
          helperText="Markdown is supported"
          value={state.serverConfig?.maintenanceMessage}
        />

        <TextInput
          fieldName="slots"
          label="Slots Configuration"
          helperText="Must be JSON. Merged with remote slots config -- This config overrides slots.txt"
          value={slots()}
          onInput={formatSlots}
          isMultiline
        />

        <Toggle
          fieldName="policiesEnabled"
          label="Enable Policies"
          helperText="Display TOS and Privacy Statements"
          disabled
          class="hidden"
        />

        <TextInput
          fieldName="termsOfService"
          label="Terms of Service"
          helperText="Not yet implemented"
          isMultiline
          disabled
        />
        <TextInput
          fieldName="privacyStatement"
          label="PrivacyStatement"
          helperText="Not yet implemented"
          isMultiline
          disabled
        />

        <div class="flex justify-end">
          <Button onClick={submit} class="w-fit">
            <SaveIcon /> Save
          </Button>
        </div>
      </form>
    </>
  )
}

type Threshold = { steps: number; cfg: number; height: number; width: number }
type Model = { name: string; desc: string; init: Threshold; limit: Threshold }

const ImageModels: Component<{ signal: Signal<Model[]> }> = (props) => {
  const rows = useRowHelper({
    signal: props.signal,
    empty: {
      name: '',
      desc: '',
      init: { steps: 5, cfg: 2, height: 1024, width: 1024 },
      limit: { steps: 128, cfg: 20, height: 1024, width: 1024 },
    },
  })

  return (
    <>
      <div class="flex items-center gap-2">
        Image Models{' '}
        <Button size="sm" onClick={rows.add}>
          Add
        </Button>
      </div>
      <For each={rows.items()}>
        {(item, i) => (
          <ImageModel index={i()} item={item} updater={rows.updater} remove={rows.remove} />
        )}
      </For>
    </>
  )
}

const ImageModel: Component<{
  index: number
  item: Model
  updater: FieldUpdater
  remove: (index: number) => void
}> = (props) => {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex w-full items-center gap-2">
        <TextInput
          fieldName="model.name"
          parentClass="w-1/2"
          placeholder="Model Name..."
          onChange={props.updater(props.index, 'name')}
          value={props.item.name}
        />
        <TextInput
          fieldName="model.desc"
          parentClass="w-1/2"
          placeholder="Model Description..."
          onChange={props.updater(props.index, 'desc')}
          value={props.item.desc}
        />
        <Button size="sm" schema="red" onClick={() => props.remove(props.index)}>
          Remove
        </Button>
      </div>

      <table class="table-auto border-separate border-spacing-2">
        <thead>
          <tr>
            <Th />
            <Th>Steps</Th>
            <Th>CFG</Th>
            <Th>Width</Th>
            <Th>Height</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td class="px-2 font-bold">Recommended</Td>
            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.steps"
                onChange={props.updater(props.index, 'init.steps')}
                value={props.item.init.steps}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.cfg"
                onChange={props.updater(props.index, 'init.cfg')}
                value={props.item.init.cfg}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.width"
                onChange={props.updater(props.index, 'init.width')}
                value={props.item.init.width}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.height"
                onChange={props.updater(props.index, 'init.height')}
                value={props.item.init.height}
              />
            </Td>
          </tr>

          <tr>
            <Td class="px-2 font-bold">Maximums</Td>
            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.steps"
                onChange={props.updater(props.index, 'limit.steps')}
                value={props.item.limit.steps}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.cfg"
                onChange={props.updater(props.index, 'limit.cfg')}
                value={props.item.limit.cfg}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.width"
                onChange={props.updater(props.index, 'limit.width')}
                value={props.item.limit.width}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.height"
                onChange={props.updater(props.index, 'limit.height')}
                value={props.item.limit.height}
              />
            </Td>
          </tr>
        </tbody>
      </table>

      <Divider />
    </div>
  )
}

const Th: Component<{ children?: any }> = (props) => (
  <th
    class="rounded-md border-[var(--bg-600)] px-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any; class?: string }> = (props) => (
  <td
    class={`rounded-md border-[var(--bg-600)] ${props.class || ''}`}
    classList={{ border: !!props.children }}
  >
    {props.children}
  </td>
)
