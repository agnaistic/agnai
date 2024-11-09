import { Accessor, Component, Setter, createEffect, on } from 'solid-js'
import { Card, Pill } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { adminStore } from '/web/store'

export const General: Component<{ slots: Accessor<string>; setSlots: Setter<string> }> = (
  props
) => {
  let slotsRef: HTMLInputElement

  const state = adminStore()

  const formatSlots = () => {
    try {
      const obj = JSON.parse(slotsRef?.value || '{}')
      const formatted = JSON.stringify(obj, null, 2)
      props.setSlots(formatted)
      slotsRef.value = formatted
    } catch (ex) {}
  }

  createEffect(
    on(
      () => state.config?.slots,
      (slots) => {
        if (!slots) return
        props.setSlots(slots)
        return slots
      }
    )
  )

  return (
    <>
      <Card bg="bg-500">
        <TextInput
          fieldName="supportEmail"
          label="Support Email"
          helperText="If provided, a link to this email will be added to the main navigation"
          value={state.config?.supportEmail}
        />

        <Toggle
          fieldName="maintenance"
          label="Maintenace Mode Enabled"
          helperText="Caution: If your database is no available, this flag will not work. Use the environment variable instead."
          value={state.config?.maintenance}
        />

        <TextInput
          fieldName="maintenanceMessage"
          isMultiline
          label="Maintenance Message"
          helperText="Markdown is supported"
          value={state.config?.maintenanceMessage}
        />

        <TextInput
          fieldName="stripeCustomerPortal"
          label="Stripe Customer Portal"
          value={state.config?.stripeCustomerPortal}
        />

        <TextInput
          fieldName="lockSeconds"
          type="number"
          label="Lock Duration (seconds)"
          helperText="Maximum TTL of user-level lock - Set to zero (0) to disable"
          value={state.config?.lockSeconds ?? 0}
        />
      </Card>

      <Card bg="bg-500">
        <TextInput
          fieldName="googleClientId"
          label={
            <div class="flex gap-4">
              <div>Google Client ID</div>
              <Toggle fieldName="googleEnabled" value={state.config?.googleEnabled} />
            </div>
          }
          helperText="Used for Sign In"
          value={state.config?.googleClientId}
        />

        <TextInput
          fieldName="slots"
          ref={(r) => (slotsRef = r)}
          label={
            <div class="flex items-center gap-2">
              Slots Configuration{' '}
              <Pill small onClick={formatSlots}>
                Format
              </Pill>
            </div>
          }
          helperText="Must be JSON. Merged with remote slots config -- This config overrides slots.txt"
          value={props.slots()}
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
        value={state.config?.apiAccess || 'off'}
      />

      <Card bg="bg-500">
        <TextInput
          fieldName="maxGuidanceTokens"
          label="Max Guidance Tokens"
          helperText="Max number of tokens a saga/guidance template can reques. Set to 0 to disable."
          type="number"
          value={state.config?.maxGuidanceTokens ?? 1000}
        />
        <TextInput
          fieldName="maxGuidanceVariables"
          label="Max Guidance Variables"
          helperText="Max number of variables a saga/guidance template can request. Set to 0 to disable."
          type="number"
          value={state.config?.maxGuidanceVariables ?? 15}
        />
      </Card>
    </>
  )
}
