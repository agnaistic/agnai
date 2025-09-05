import { Component } from 'solid-js'
import { Card } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { adminStore, settingStore } from '/web/store'
import { ConfigSetters, ConfigState } from '../types'

export const Voice: Component<{ state: ConfigState; setters: ConfigSetters }> = (props) => {
  const settings = settingStore((s) => s.config)
  const state = adminStore((s) => ({ config: s.config }))

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
        onChange={(ev) => props.setters('ttsAccess', ev.value as any)}
      />

      <TextInput
        fieldName="ttsHost"
        label="Voice Host"
        helperText="Full URL with Path - Include any query parameters"
        value={state.config?.ttsHost}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
        onChange={(ev) => props.setters('ttsHost', ev.currentTarget.value)}
      />

      <TextInput
        fieldName="ttsApiKey"
        label="Voice API Key"
        value={''}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
        onChange={(ev) => props.setters('ttsApiKey', ev.currentTarget.value)}
      />
    </Card>
  )
}
