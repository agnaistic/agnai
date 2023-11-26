import { Component, createSignal } from 'solid-js'
import { adminStore, settingStore, userStore } from '/web/store'
import { useNavigate } from '@solidjs/router'
import PageHeader from '/web/shared/PageHeader'
import { Toggle } from '/web/shared/Toggle'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { getStrictForm } from '/web/shared/util'
import { SaveIcon } from 'lucide-solid'
import Button from '/web/shared/Button'

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

  const submit = () => {
    const body = getStrictForm(form, {
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      termsOfService: 'string',
      privacyStatement: 'string',
      policiesEnabled: 'boolean',
    })

    adminStore.updateServerConfig({ ...body, slots: slots(), enabledAdapters: [] })
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

export { ServerConfiguration as default }
