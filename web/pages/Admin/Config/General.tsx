import { Component } from 'solid-js'
import { Card, Pill } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { ConfigSetters, ConfigState } from '../types'

export const General: Component<{ state: ConfigState; setters: ConfigSetters }> = (props) => {
  const updateSlots = () => {
    try {
      const obj = JSON.parse(props.state.slots || '{}')
      const formatted = JSON.stringify(obj, null, 2)
      props.setters('slots', formatted)
    } catch (ex) {}
  }

  return (
    <>
      <Card bg="bg-500">
        <TextInput
          fieldName="supportEmail"
          label="Support Email"
          helperText="If provided, a link to this email will be added to the main navigation"
          value={props.state.supportEmail}
          onChange={(ev) => props.setters('supportEmail', ev.currentTarget.value)}
        />

        <Toggle
          fieldName="maintenance"
          label="Maintenace Mode Enabled"
          helperText="Caution: If your database is no available, this flag will not work. Use the environment variable instead."
          value={props.state.maintenance}
          onChange={(ev) => props.setters('maintenance', ev)}
        />

        <TextInput
          fieldName="maintenanceMessage"
          isMultiline
          label="Maintenance Message"
          helperText="Markdown is supported"
          value={props.state.maintenanceMessage}
          onChange={(ev) => props.setters('maintenanceMessage', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="stripeCustomerPortal"
          label="Stripe Customer Portal"
          value={props.state.stripeCustomerPortal}
          onChange={(ev) => props.setters('stripeCustomerPortal', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="lockSeconds"
          type="number"
          label="Lock Duration (seconds)"
          helperText="Maximum TTL of user-level lock - Set to zero (0) to disable"
          value={props.state.lockSeconds ?? 0}
          onChange={(ev) => props.setters('lockSeconds', +ev.currentTarget.value)}
        />
      </Card>

      <Card bg="bg-500">
        <TextInput
          fieldName="googleClientId"
          label={
            <div class="flex gap-4">
              <div>Google Client ID</div>
              <Toggle fieldName="googleEnabled" value={props.state.googleEnabled} />
            </div>
          }
          helperText="Used for Sign In"
          value={props.state.googleClientId}
          onChange={(ev) => props.setters('googleClientId', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="slots"
          label={
            <div class="flex items-center gap-2">
              Slots Configuration{' '}
              <Pill small onClick={updateSlots}>
                Format
              </Pill>
            </div>
          }
          helperText="Must be JSON. Merged with remote slots config -- This config overrides slots.txt"
          value={props.state.slots}
          onChange={(ev) => props.setters('slots', ev.currentTarget.value)}
          isMultiline
        />
      </Card>

      <Card bg="bg-500">
        <Toggle
          fieldName="policiesEnabled"
          label="Enable Policies"
          helperText="Display TOS and Privacy Statements"
          disabled
          class="hidden"
          onChange={(ev) => props.setters('policiesEnabled', ev)}
        />

        <TextInput
          fieldName="termsOfService"
          label="Terms of Service"
          helperText="Not yet implemented"
          isMultiline
          disabled
          onChange={(ev) => props.setters('termsOfService', ev.currentTarget.value)}
        />
        <TextInput
          fieldName="privacyStatement"
          label="PrivacyStatement"
          helperText="Not yet implemented"
          isMultiline
          disabled
          onChange={(ev) => props.setters('privacyStatement', ev.currentTarget.value)}
        />
      </Card>

      <Select
        fieldName="apiAccess"
        label="API Access Level"
        items={[
          { label: 'Off', value: 'off' },
          { label: 'All Users', value: 'users' },
          { label: 'Subscribers', value: 'subscribers' },
          { label: 'Adminstrators', value: 'admins' },
        ]}
        value={props.state.apiAccess || 'off'}
        onChange={(ev) => props.setters('apiAccess', ev.value as any)}
      />

      <Card bg="bg-500">
        <TextInput
          fieldName="maxGuidanceTokens"
          label="Max Guidance Tokens"
          helperText="Max number of tokens a saga/guidance template can reques. Set to 0 to disable."
          type="number"
          value={props.state.maxGuidanceTokens ?? 1000}
          onChange={(ev) => props.setters('maxGuidanceTokens', +ev.currentTarget.value)}
        />
        <TextInput
          fieldName="maxGuidanceVariables"
          label="Max Guidance Variables"
          helperText="Max number of variables a saga/guidance template can request. Set to 0 to disable."
          type="number"
          value={props.state.maxGuidanceVariables ?? 15}
          onChange={(ev) => props.setters('maxGuidanceVariables', +ev.currentTarget.value)}
        />
      </Card>
    </>
  )
}
