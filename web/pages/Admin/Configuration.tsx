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
import { useTransContext } from '@mbarzda/solid-i18next'

const ServerConfiguration: Component = () => {
  const [t] = useTransContext()

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
      <PageHeader title={t('server_configuration')} />

      <form ref={form!} class="flex flex-col gap-2" onSubmit={(ev) => ev.preventDefault()}>
        <Select
          fieldName="apiAccess"
          label={t('api_access_level')}
          items={[
            { label: t('off'), value: 'off' },
            { label: t('all_users'), value: 'users' },
            { label: t('subscribers'), value: 'subscribers' },
            { label: t('administrators'), value: 'admins' },
          ]}
          value={state.serverConfig?.apiAccess || t('off')}
        />

        <Toggle
          fieldName="maintenance"
          label={t('maintenance_mode_enabled')}
          helperText={t('maintenance_mode_message')}
          value={state.serverConfig?.maintenance}
        />

        <TextInput
          fieldName="maintenanceMessage"
          isMultiline
          label={t('maintenance_message')}
          helperText={t('markdown_is_supported')}
          value={state.serverConfig?.maintenanceMessage}
        />

        <TextInput
          fieldName="slots"
          label={t('slots_configuration')}
          helperText={t('slots_configuration_message')}
          value={slots()}
          onInput={formatSlots}
          isMultiline
        />

        <Toggle
          fieldName="policiesEnabled"
          label={t('enable_policies')}
          helperText={t('display_tos_and_privacy_statements')}
          disabled
          class="hidden"
        />

        <TextInput
          fieldName="termsOfService"
          label={t('terms_of_service')}
          helperText={t('not_yet_implemented')}
          isMultiline
          disabled
        />
        <TextInput
          fieldName="privacyStatement"
          label={t('privacy_policy')}
          helperText={t('not_yet_implemented')}
          isMultiline
          disabled
        />

        <div class="flex justify-end">
          <Button onClick={submit} class="w-fit">
            <SaveIcon /> {t('save')}
          </Button>
        </div>
      </form>
    </>
  )
}

export { ServerConfiguration as default }
