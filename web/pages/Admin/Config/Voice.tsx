import { Component } from 'solid-js'
import { Card } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { adminStore, settingStore } from '/web/store'

export const Voice: Component = (props) => {
  const settings = settingStore((s) => s.config)
  const state = adminStore()

  return (
    <Card bg="bg-500">
      <Select
        fieldName="ttsAccess"
        label="Voice Access Level"
        items={[
          { label: 'Off', value: 'off' },
          { label: 'All Users', value: 'users' },
          { label: 'Subscribers', value: 'subscribers' },
          { label: 'Adminstrators', value: 'admins' },
        ]}
        value={state.config?.ttsAccess || 'off'}
      />

      <TextInput
        fieldName="ttsHost"
        label="Voice Host"
        helperText="Full URL with Path - Include any query parameters"
        value={state.config?.ttsHost}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
      />

      <TextInput
        fieldName="ttsApiKey"
        label="Voice API Key"
        value={''}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
      />
    </Card>
  )
}
